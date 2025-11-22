from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from enum import Enum

class AgentRole(str, Enum):
    JUDGE = "judge"
    PROSECUTOR = "prosecutor"
    DEFENSE = "defense"

class AgentConfig(BaseModel):
    role: AgentRole
    name: str
    system_prompt: str
    voice_id: str
    personality_traits: List[str]
    legal_context: Dict[str, Any]
    case_context: str

class AgentResponse(BaseModel):
    role: AgentRole
    text: str
    reasoning: Optional[str] = None

