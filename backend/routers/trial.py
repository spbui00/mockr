from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict, Any
from models.trial import CreateTrialRequest, TrialSession, TrialStatus
from services.openjustice import openjustice_service
from services.agent_manager import AgentManager
from datetime import datetime
import uuid
import PyPDF2
import io
from PIL import Image
import pytesseract

router = APIRouter()

trial_sessions: Dict[str, Dict[str, Any]] = {}

@router.post("/create")
async def create_trial(request: CreateTrialRequest) -> Dict[str, Any]:
    try:
        session_id = str(uuid.uuid4())
        
        legal_context = await openjustice_service.get_legal_context(
            jurisdiction=request.legal_properties.jurisdiction,
            legal_areas=request.legal_properties.legal_areas,
            case_description=request.case_context.description
        )
        
        agent_manager = AgentManager()
        agent_manager.create_agents(
            session_id=session_id,
            roles=[role.role for role in request.roles if role.enabled],
            legal_context=legal_context,
            case_context=request.case_context
        )
        
        session = {
            "session_id": session_id,
            "status": TrialStatus.CREATED,
            "roles": request.roles,
            "legal_properties": request.legal_properties,
            "case_context": request.case_context,
            "legal_context": legal_context,
            "agent_manager": agent_manager,
            "messages": [],
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        trial_sessions[session_id] = session
        
        return {
            "session_id": session_id,
            "status": "created",
            "agents": [
                {
                    "role": agent.role.value,
                    "name": agent.name,
                    "traits": agent.personality_traits
                }
                for agent in agent_manager.get_all_agents().values()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}")
async def get_trial_session(session_id: str) -> Dict[str, Any]:
    if session_id not in trial_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = trial_sessions[session_id]
    agent_manager = session["agent_manager"]
    
    return {
        "session_id": session_id,
        "status": session["status"],
        "agents": [
            {
                "role": agent.role.value,
                "name": agent.name,
                "traits": agent.personality_traits
            }
            for agent in agent_manager.get_all_agents().values()
        ],
        "messages": session["messages"]
    }

@router.post("/{session_id}/context")
async def upload_context_document(
    session_id: str,
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    if session_id not in trial_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        content = await file.read()
        extracted_text = ""
        
        if file.filename.endswith('.pdf'):
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            for page in pdf_reader.pages:
                extracted_text += page.extract_text()
        
        elif file.filename.endswith(('.png', '.jpg', '.jpeg')):
            image = Image.open(io.BytesIO(content))
            extracted_text = pytesseract.image_to_string(image)
        
        else:
            extracted_text = content.decode('utf-8')
        
        session = trial_sessions[session_id]
        session["case_context"].additional_info[file.filename] = extracted_text
        
        return {
            "filename": file.filename,
            "extracted_text_length": len(extracted_text),
            "status": "processed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.delete("/{session_id}")
async def end_trial(session_id: str) -> Dict[str, Any]:
    if session_id not in trial_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = trial_sessions[session_id]
    session["status"] = TrialStatus.ENDED
    
    return {"status": "ended", "session_id": session_id}

