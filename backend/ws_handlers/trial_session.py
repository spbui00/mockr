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
    await websocket.accept()
    active_connections[session_id] = websocket
    
    from routers.trial import trial_sessions
    
    if session_id not in trial_sessions:
        await websocket.send_json({
            "type": "error",
            "message": "Session not found"
        })
        await websocket.close()
        return
    
    session = trial_sessions[session_id]
    session["status"] = "active"
    
    await websocket.send_json({
        "type": "connected",
        "message": "Connected to trial session",
        "session_id": session_id
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "audio":
                await handle_audio_message(websocket, session_id, data, session)
            
            elif data["type"] == "text":
                await handle_text_message(websocket, session_id, data, session)
            
            elif data["type"] == "end_trial":
                session["status"] = "ended"
                await websocket.send_json({
                    "type": "trial_ended",
                    "message": "Trial session ended"
                })
                break
    
    except WebSocketDisconnect:
        if session_id in active_connections:
            del active_connections[session_id]
        session["status"] = "paused"
    
    except Exception as e:
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
    try:
        audio_base64 = data.get("audio")
        audio_bytes = base64.b64decode(audio_base64)
        
        await websocket.send_json({
            "type": "processing",
            "message": "Transcribing audio..."
        })
        
        transcript = await speech_service.transcribe_audio(audio_bytes)
        
        await websocket.send_json({
            "type": "transcription",
            "text": transcript
        })
        
        await handle_text_message(
            websocket, 
            session_id, 
            {"type": "text", "text": transcript}, 
            session
        )
    
    except Exception as e:
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
    try:
        user_text = data.get("text")
        
        session["messages"].append({
            "id": f"msg_{len(session['messages'])}",
            "type": "user",
            "content": user_text,
            "timestamp": datetime.now().isoformat()
        })
        
        await websocket.send_json({
            "type": "user_message",
            "content": user_text,
            "timestamp": datetime.now().isoformat()
        })
        
        agent_manager = session["agent_manager"]
        
        await websocket.send_json({
            "type": "agent_thinking",
            "message": "Agent is preparing response..."
        })
        
        agent_response = await agent_manager.get_agent_response(user_text, session_id)
        
        session["messages"].append({
            "id": f"msg_{len(session['messages'])}",
            "type": "agent",
            "role": agent_response.role.value,
            "content": agent_response.text,
            "timestamp": datetime.now().isoformat()
        })
        
        await websocket.send_json({
            "type": "agent_response",
            "role": agent_response.role.value,
            "content": agent_response.text,
            "timestamp": datetime.now().isoformat()
        })
        
        await websocket.send_json({
            "type": "synthesizing",
            "message": "Generating speech..."
        })
        
        audio_bytes = await speech_service.synthesize_speech(
            agent_response.text,
            agent_response.role.value
        )
        
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        await websocket.send_json({
            "type": "agent_audio",
            "role": agent_response.role.value,
            "audio": audio_base64,
            "text": agent_response.text
        })
    
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Message processing failed: {str(e)}"
        })

