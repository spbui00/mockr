from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any
from datetime import datetime
from services.openjustice import openjustice_service
import json
import base64

router = APIRouter()

active_fact_gathering_sessions: Dict[str, Dict[str, Any]] = {}

@router.websocket("/ws/fact-gathering/{session_id}")
async def websocket_fact_gathering_endpoint(websocket: WebSocket, session_id: str):
    await handle_fact_gathering_session(websocket, session_id)

async def handle_fact_gathering_session(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    session = {
        "websocket": websocket,
        "conversation_id": None,
        "execution_id": None,
        "flow_id": None,
        "messages": [],
        "uploaded_files": [],
        "pending_files": [],
        "created_at": datetime.now()
    }
    
    active_fact_gathering_sessions[session_id] = session
    
    try:
        await websocket.send_json({
            "type": "connected",
            "session_id": session_id
        })
        
        async for data in websocket.iter_json():
            message_type = data.get("type")
            
            if message_type == "initialize":
                await handle_initialize(websocket, session_id, data, session)
            
            elif message_type == "message":
                await handle_user_message(websocket, session_id, data, session)
            
            elif message_type == "upload":
                await handle_file_upload(websocket, session_id, data, session)
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })
    
    except WebSocketDisconnect:
        print(f"Fact gathering session {session_id} disconnected")
    
    except Exception as e:
        print(f"Error in fact gathering session {session_id}: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
    
    finally:
        if session_id in active_fact_gathering_sessions:
            del active_fact_gathering_sessions[session_id]

async def handle_initialize(
    websocket: WebSocket,
    session_id: str,
    data: Dict[str, Any],
    session: Dict[str, Any]
):
    try:
        flow_id = data.get("flowId")
        if not flow_id:
            await websocket.send_json({
                "type": "error",
                "message": "Flow ID is required"
            })
            return
        
        session["flow_id"] = flow_id
        
        system_prompt = """You are an AI legal assistant helping to gather case facts for a mock trial simulation. 
Your role is to ask relevant questions about the case, understand the context, gather important details, 
and prepare comprehensive case information that will be used in the trial. Be thorough, professional, 
and guide the user through providing all necessary details about their case."""
        
        result = await openjustice_service.send_message_to_conversation(
            conversation_id=None,
            user_message="Hello, I need help with my case.",
            title="New Case",
            system_prompt=system_prompt
        )
        
        conversation_id = result.get("conversationId")
        session["conversation_id"] = conversation_id
        
        await websocket.send_json({
            "type": "conversation_created",
            "conversationId": conversation_id
        })
        
        await stream_dialog_flow_response(
            websocket,
            session,
            dialog_flow_id=flow_id,
            conversation_id=conversation_id
        )
    
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Initialization failed: {str(e)}"
        })

async def handle_user_message(
    websocket: WebSocket,
    session_id: str,
    data: Dict[str, Any],
    session: Dict[str, Any]
):
    try:
        text = data.get("text")
        if not text:
            await websocket.send_json({
                "type": "error",
                "message": "Message text is required"
            })
            return
        
        conversation_id = session.get("conversation_id")
        if not conversation_id:
            await websocket.send_json({
                "type": "error",
                "message": "No active conversation. Initialize first."
            })
            return
        
        session["messages"].append({
            "id": f"msg_{len(session['messages'])}",
            "role": "user",
            "content": text,
            "timestamp": datetime.now().isoformat()
        })
        
        await websocket.send_json({
            "type": "user_message",
            "content": text,
            "timestamp": datetime.now().isoformat()
        })
        
        pending_files = session.get("pending_files", [])
        flow_id = session.get("flow_id")
        
        if pending_files:
            print(f"[handle_user_message] Sending message with {len(pending_files)} attached file(s): {[f['name'] for f in pending_files]}")
        
        await openjustice_service.send_message_to_conversation(
            conversation_id=conversation_id,
            user_message=text,
            resources=pending_files if pending_files else None
        )
        
        had_files = False
        if pending_files:
            print(f"[handle_user_message] Files attached successfully, clearing pending_files")
            session["pending_files"] = []
            had_files = True
            print(f"[handle_user_message] Will stream with conversationId={conversation_id}, flowId={flow_id} (NOT executionId)")
        
        execution_id = session.get("execution_id")
        
        print(f"[handle_user_message] Streaming with conversation_id={conversation_id}, flow_id={flow_id}, execution_id={execution_id}, had_files={had_files}")
        
        if had_files and flow_id and conversation_id:
            print(f"[handle_user_message] Files were attached - streaming with conversation+flow (ignoring old executionId)")
            await stream_dialog_flow_response(
                websocket,
                session,
                dialog_flow_id=flow_id,
                conversation_id=conversation_id
            )
        elif execution_id:
            await stream_dialog_flow_response(
                websocket,
                session,
                execution_id=execution_id
            )
        elif flow_id and conversation_id:
            await stream_dialog_flow_response(
                websocket,
                session,
                dialog_flow_id=flow_id,
                conversation_id=conversation_id
            )
        else:
            await websocket.send_json({
                "type": "error",
                "message": "Cannot continue - no execution ID or flow ID available"
            })
    
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Message handling failed: {str(e)}"
        })

async def stream_dialog_flow_response(
    websocket: WebSocket,
    session: Dict[str, Any],
    dialog_flow_id: str = None,
    conversation_id: str = None,
    execution_id: str = None
):
    try:
        print(f"[stream_dialog_flow_response] Starting stream with dialog_flow_id={dialog_flow_id}, conversation_id={conversation_id}, execution_id={execution_id}")
        
        await websocket.send_json({
            "type": "streaming_start"
        })
        
        current_message = ""
        last_node_type = None
        is_awaiting_input = False
        has_received_any_message = False
        event_count = 0
        
        async for event in openjustice_service.stream_dialog_flow(
            dialog_flow_id=dialog_flow_id,
            conversation_id=conversation_id,
            execution_id=execution_id
        ):
            event_count += 1
            event_type = event.get("event")
            event_data = event.get("data", {})
            
            if event_count % 10 == 0:
                print(f"[stream_dialog_flow_response] Processed {event_count} events, current message length: {len(current_message)}")
            
            
            if event_type == "message":
                text = event_data.get("text", "")
                current_message += text
                has_received_any_message = True
                
                if event_count <= 5 or event_count % 50 == 0:
                    print(f"[stream_dialog_flow_response] Message event #{event_count}: '{text[:50]}...' (total length: {len(current_message)})")
                
                await websocket.send_json({
                    "type": "ai_message",
                    "text": text,
                    "isComplete": False
                })
            
            elif event_type == "error":
                error_text = event_data.get("text", "") or event_data.get("message", "")
                if error_text:
                    print(f"[WS Handler] Stream error: {error_text}")
                    if "INVALID_TOOL_RESULTS" in error_text or "stream error" in error_text.lower():
                        print("[WS Handler] LangChain tool error detected - saving partial message")
                    elif "tool_use.name" in error_text or "400" in error_text:
                        print("[WS Handler] File processing error from OpenJustice API - known issue with their file handling")
                
                if current_message and current_message.strip():
                    print(f"[WS Handler] Saving partial response ({len(current_message)} chars) before error")
                    session["messages"].append({
                        "id": f"msg_{len(session['messages'])}",
                        "role": "assistant",
                        "content": current_message,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    if "tool_use.name" in error_text and len(current_message) > 50:
                        print(f"[WS Handler] File was processed (got {len(current_message)} chars), treating as success despite error")
                        await websocket.send_json({
                            "type": "flow_complete"
                        })
                        return
                
                error_message = error_text or "Stream error occurred"
                if "tool_use.name" in error_text:
                    error_message = "File was processed but OpenJustice encountered an error. The partial response has been saved."
                
                await websocket.send_json({
                    "type": "error",
                    "message": error_message
                })
                break
            
            elif event_type == "node-result":
                node_type = event_data.get("nodeType")
                node_status = event_data.get("status")
                node_title = event_data.get("title", "")
                node_desc = event_data.get("description", "")
                
                print(f"[stream_dialog_flow_response] Node result: type={node_type}, status={node_status}, title={node_title}")
                
                last_node_type = node_type
                
                if node_status == "running":
                    status_msg = f"{node_title}: {node_desc}"
                    await websocket.send_json({
                        "type": "ai_message",
                        "text": status_msg + "...\n",
                        "isComplete": False
                    })
                    current_message += status_msg + "...\n"
                
                elif node_status == "completed" and node_type == "fact":
                    node_data = event_data.get("data", {})
                    if node_data:
                        facts_summary = f"\n✓ {node_title} gathered\n"
                        await websocket.send_json({
                            "type": "ai_message",
                            "text": facts_summary,
                            "isComplete": False
                        })
                        current_message += facts_summary
            
            elif event_type == "awaiting-user-input":
                new_execution_id = event_data.get("executionId")
                if new_execution_id:
                    session["execution_id"] = new_execution_id
                
                if current_message:
                    session["messages"].append({
                        "id": f"msg_{len(session['messages'])}",
                        "role": "assistant",
                        "content": current_message,
                        "timestamp": datetime.now().isoformat()
                    })
                
                is_awaiting_input = True
                current_message = ""
                
                await websocket.send_json({
                    "type": "awaiting_input",
                    "executionId": new_execution_id
                })
            
            elif event_type == "done":
                if not is_awaiting_input:
                    if current_message:
                        session["messages"].append({
                            "id": f"msg_{len(session['messages'])}",
                            "role": "assistant",
                            "content": current_message,
                            "timestamp": datetime.now().isoformat()
                        })
                    
                    await websocket.send_json({
                        "type": "flow_complete"
                    })
                    current_message = ""
                else:
                    print("[WS Handler] Received 'done' but we're awaiting input - not sending flow_complete")
            
            elif event_type == "stream-complete":
                if current_message:
                    session["messages"].append({
                        "id": f"msg_{len(session['messages'])}",
                        "role": "assistant",
                        "content": current_message,
                        "timestamp": datetime.now().isoformat()
                    })
                    current_message = ""
                
                await websocket.send_json({
                    "type": "streaming_end"
                })
                break
        
        print(f"[WS Handler] Stream ended. Last node type: {last_node_type}, Is awaiting input: {is_awaiting_input}, Current message length: {len(current_message)}, Has received message: {has_received_any_message}")
        
        if current_message:
            session["messages"].append({
                "id": f"msg_{len(session['messages'])}",
                "role": "assistant",
                "content": current_message,
                "timestamp": datetime.now().isoformat()
            })
        
        if is_awaiting_input:
            execution_id = session.get("execution_id")
            if execution_id:
                if not has_received_any_message and not current_message:
                    await websocket.send_json({
                        "type": "ai_message",
                        "text": "Ready to gather facts. Please provide information about your case.",
                        "isComplete": False
                    })
                    await websocket.send_json({
                        "type": "awaiting_input",
                        "executionId": execution_id
                    })
                else:
                    await websocket.send_json({
                        "type": "awaiting_input",
                        "executionId": execution_id
                    })
                print(f"[WS Handler] Sent awaiting_input with executionId: {execution_id}")
            else:
                print("[WS Handler] Warning: Stream ended awaiting input but no executionId")
        elif last_node_type == "outcome" or not session.get("execution_id"):
            print("[WS Handler] Flow complete - outcome node or no execution_id")
            await websocket.send_json({
                "type": "flow_complete"
            })
        else:
            print("[WS Handler] Warning: Stream ended without awaiting input but executionId exists - treating as awaiting input")
            execution_id = session.get("execution_id")
            await websocket.send_json({
                "type": "awaiting_input",
                "executionId": execution_id
            })
        
    except Exception as e:
        print(f"[WS Handler] Exception during streaming: {str(e)}")
        if current_message:
            session["messages"].append({
                "id": f"msg_{len(session['messages'])}",
                "role": "assistant",
                "content": current_message,
                "timestamp": datetime.now().isoformat()
            })
        await websocket.send_json({
            "type": "error",
            "message": f"Streaming failed: {str(e)}"
        })

async def handle_file_upload(
    websocket: WebSocket,
    session_id: str,
    data: Dict[str, Any],
    session: Dict[str, Any]
):
    try:
        file_base64 = data.get("file")
        filename = data.get("filename")
        
        if not file_base64 or not filename:
            await websocket.send_json({
                "type": "error",
                "message": "File data and filename are required"
            })
            return
        
        file_bytes = base64.b64decode(file_base64)
        
        result = await openjustice_service.upload_file_to_conversation(
            file_data=file_bytes,
            filename=filename
        )
        
        resource_id = result.get("resourceId")
        
        file_resource = {
            "id": resource_id,
            "name": filename
        }
        
        session["uploaded_files"].append(file_resource)
        session["pending_files"].append(file_resource)
        
        print(f"[handle_file_upload] File uploaded successfully: {filename} (ID: {resource_id})")
        print(f"[handle_file_upload] Total uploaded files: {len(session['uploaded_files'])}, Pending: {len(session['pending_files'])}")
        
        await websocket.send_json({
            "type": "file_uploaded",
            "filename": filename,
            "resourceId": resource_id,
            "size": len(file_bytes)
        })
    
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"File upload failed: {str(e)}"
        })

