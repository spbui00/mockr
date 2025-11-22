from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any
import json
import asyncio
from services.speech_service import speech_service
from datetime import datetime
import base64

router = APIRouter()

active_connections: Dict[str, WebSocket] = {}

@router.websocket("/ws/trial/{session_id}")
async def websocket_trial_endpoint(websocket: WebSocket, session_id: str):
    print(f"[WS_TRIAL] New WebSocket connection for session {session_id}")
    await websocket.accept()
    print(f"[WS_TRIAL] WebSocket accepted")
    active_connections[session_id] = websocket
    
    from routers.trial import trial_sessions
    
    print(f"[WS_TRIAL] Available sessions: {list(trial_sessions.keys())}")
    print(f"[WS_TRIAL] Looking for session: {session_id}")
    
    if session_id not in trial_sessions:
        print(f"[WS_TRIAL] ERROR: Session {session_id} not found")
        print(f"[WS_TRIAL] Total sessions in memory: {len(trial_sessions)}")
        await websocket.send_json({
            "type": "error",
            "message": "Session not found. Please create a trial session first."
        })
        await websocket.close()
        return
    
    session = trial_sessions[session_id]
    session["status"] = "active"
    print(f"[WS_TRIAL] Session {session_id} is now active")
    
    await websocket.send_json({
        "type": "connected",
        "message": "Connected to trial session",
        "session_id": session_id
    })
    print(f"[WS_TRIAL] Sent connected message to client")
    
    try:
        while True:
            print(f"[WS_TRIAL] Waiting for message on session {session_id}...")
            data = await websocket.receive_json()
            print(f"[WS_TRIAL] Received message: type={data.get('type')}, keys={list(data.keys())}")
            
            if data["type"] == "audio":
                print(f"[WS_TRIAL] Routing to audio handler")
                await handle_audio_message(websocket, session_id, data, session)
            
            elif data["type"] == "text":
                print(f"[WS_TRIAL] Routing to text handler")
                await handle_text_message(websocket, session_id, data, session)
            
            elif data["type"] == "end_trial":
                print(f"[WS_TRIAL] End trial requested")
                session["status"] = "ended"
                await websocket.send_json({
                    "type": "trial_ended",
                    "message": "Trial session ended"
                })
                break
            else:
                print(f"[WS_TRIAL] Unknown message type: {data['type']}")
    
    except WebSocketDisconnect:
        print(f"[WS_TRIAL] Client disconnected from session {session_id}")
        if session_id in active_connections:
            del active_connections[session_id]
        session["status"] = "paused"
    
    except Exception as e:
        print(f"[WS_TRIAL] ERROR in websocket loop: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
        if session_id in active_connections:
            del active_connections[session_id]

async def handle_audio_message(
    websocket: WebSocket,
    session_id: str,
    data: Dict[str, Any],
    session: Dict[str, Any]
):
    print(f"[WS_AUDIO] Received audio message for session {session_id}")
    print(f"[WS_AUDIO] Data keys: {data.keys()}")
    
    try:
        audio_base64 = data.get("audio")
        print(f"[WS_AUDIO] Audio base64 present: {audio_base64 is not None}")
        
        if audio_base64:
            print(f"[WS_AUDIO] Base64 length: {len(audio_base64)} chars")
            print(f"[WS_AUDIO] First 50 chars: {audio_base64[:50]}")
        
        print(f"[WS_AUDIO] Decoding base64...")
        audio_bytes = base64.b64decode(audio_base64)
        print(f"[WS_AUDIO] Decoded audio bytes: {len(audio_bytes)} bytes")
        
        await websocket.send_json({
            "type": "processing",
            "message": "Transcribing audio..."
        })
        print(f"[WS_AUDIO] Sent processing message to client")
        
        print(f"[WS_AUDIO] Calling speech service...")
        transcript = await speech_service.transcribe_audio(audio_bytes)
        print(f"[WS_AUDIO] Received transcript: '{transcript}'")
        
        await websocket.send_json({
            "type": "transcription",
            "text": transcript
        })
        print(f"[WS_AUDIO] Sent transcription to client")
        
        print(f"[WS_AUDIO] Forwarding to text handler...")
        await handle_text_message(
            websocket, 
            session_id, 
            {"type": "text", "text": transcript}, 
            session
        )
        print(f"[WS_AUDIO] Audio message handling complete")
    
    except Exception as e:
        print(f"[WS_AUDIO] ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        await websocket.send_json({
            "type": "error",
            "message": f"Audio processing failed: {str(e)}"
        })

async def handle_text_message(
    websocket: WebSocket,
    session_id: str,
    data: Dict[str, Any],
    session: Dict[str, Any]
):
    print(f"[WS_TEXT] Handling text message: '{data.get('text', '')[:50]}...'")
    try:
        user_text = data.get("text")
        
        session["messages"].append({
            "id": f"msg_{len(session['messages'])}",
            "type": "user",
            "content": user_text,
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"[WS_TEXT] Sending user_message to client")
        await websocket.send_json({
            "type": "user_message",
            "content": user_text,
            "timestamp": datetime.now().isoformat()
        })
        
        agent_manager = session["agent_manager"]
        
        print(f"[WS_TEXT] Sending agent_thinking to client")
        await websocket.send_json({
            "type": "agent_thinking",
            "message": "Agent is preparing response..."
        })
        
        print(f"[WS_TEXT] Getting agent response...")
        agent_response = await agent_manager.get_agent_response(user_text, session_id)
        print(f"[WS_TEXT] Agent response received: {len(agent_response.text)} chars")
        
        session["messages"].append({
            "id": f"msg_{len(session['messages'])}",
            "type": "agent",
            "role": agent_response.role.value,
            "content": agent_response.text,
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"[WS_TEXT] Sending agent_response to client")
        await websocket.send_json({
            "type": "agent_response",
            "role": agent_response.role.value,
            "content": agent_response.text,
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"[WS_TEXT] Sending synthesizing to client")
        await websocket.send_json({
            "type": "synthesizing",
            "message": "Generating speech..."
        })
        
        print(f"[WS_TEXT] Synthesizing speech...")
        audio_bytes = await speech_service.synthesize_speech(
            agent_response.text,
            agent_response.role.value
        )
        print(f"[WS_TEXT] Speech synthesized: {len(audio_bytes)} bytes")
        
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        print(f"[WS_TEXT] Sending agent_audio to client ({len(audio_base64)} chars base64)")
        
        await websocket.send_json({
            "type": "agent_audio",
            "role": agent_response.role.value,
            "audio": audio_base64,
            "text": agent_response.text
        })
        print(f"[WS_TEXT] Text message handling complete")
    
    except Exception as e:
        print(f"[WS_TEXT] ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        await websocket.send_json({
            "type": "error",
            "message": f"Message processing failed: {str(e)}"
        })

