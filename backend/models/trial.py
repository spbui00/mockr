from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class RoleType(str, Enum):
    JUDGE = "judge"
    PROSECUTOR = "prosecutor"
    DEFENSE = "defense"

class TrialStatus(str, Enum):
    CREATED = "created"
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"

class MessageType(str, Enum):
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"

class RoleConfig(BaseModel):
    role: RoleType
    enabled: bool

class LegalPropertiesConfig(BaseModel):
    jurisdiction: str
    legal_areas: List[str]
    articles: List[str] = []
    case_law: List[str] = []

class CaseContextConfig(BaseModel):
    description: str
    documents: List[str] = []
    additional_info: Dict[str, Any] = {}

class CreateTrialRequest(BaseModel):
    roles: List[RoleConfig]
    legal_properties: LegalPropertiesConfig
    case_context: CaseContextConfig

class TrialMessage(BaseModel):
    id: str
    session_id: str
    message_type: MessageType
    role: Optional[RoleType] = None
    content: str
    timestamp: datetime
    audio_url: Optional[str] = None

class TrialSession(BaseModel):
    session_id: str
    status: TrialStatus
    roles: List[RoleConfig]
    legal_properties: LegalPropertiesConfig
    case_context: CaseContextConfig
    messages: List[TrialMessage] = []
    created_at: datetime
    updated_at: datetime

