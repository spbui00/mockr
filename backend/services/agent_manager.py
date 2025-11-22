from typing import Dict, List, Any, Optional
from models.agents import AgentRole, AgentConfig, AgentResponse
from models.trial import RoleType, LegalPropertiesConfig, CaseContextConfig
from services.openjustice import openjustice_service
import json
import re

class AgentManager:
    def __init__(self, session_id: str = "", conversation_id: str = "", flow_id: str = ""):
        self.agents: Dict[str, AgentConfig] = {}
        self.conversation_history: List[Dict[str, str]] = []
        self.session_id = session_id
        self.conversation_id = conversation_id
        self.trial_flow_id = flow_id
        self.trial_execution_id: Optional[str] = None
    
    def create_agents(
        self,
        session_id: str,
        roles: List[RoleType],
        legal_context: Dict[str, Any],
        case_context: CaseContextConfig
    ):
        self.agents = {}
        
        for role in roles:
            agent_config = self._create_agent_config(role, legal_context, case_context)
            self.agents[role.value] = agent_config
    
    def _create_agent_config(
        self,
        role: RoleType,
        legal_context: Dict[str, Any],
        case_context: CaseContextConfig
    ) -> AgentConfig:
        role_configs = {
            RoleType.JUDGE: {
                "name": "Judge Anderson",
                "system_prompt": self._get_judge_prompt(legal_context, case_context),
                "voice_id": "aura-athena-en",
                "personality_traits": ["impartial", "authoritative", "procedural", "fair"]
            },
            RoleType.PROSECUTOR: {
                "name": "District Attorney Martinez",
                "system_prompt": self._get_prosecutor_prompt(legal_context, case_context),
                "voice_id": "aura-arcas-en",
                "personality_traits": ["assertive", "methodical", "persuasive", "justice-focused"]
            },
            RoleType.DEFENSE: {
                "name": "Defense Attorney Chen",
                "system_prompt": self._get_defense_prompt(legal_context, case_context),
                "voice_id": "aura-angus-en",
                "personality_traits": ["protective", "analytical", "strategic", "client-focused"]
            }
        }
        
        config = role_configs[role]
        return AgentConfig(
            role=AgentRole(role.value),
            name=config["name"],
            system_prompt=config["system_prompt"],
            voice_id=config["voice_id"],
            personality_traits=config["personality_traits"],
            legal_context=legal_context,
            case_context=case_context.description
        )
    
    def _get_judge_prompt(self, legal_context: Dict[str, Any], case_context: CaseContextConfig) -> str:
        return f"""You are Judge Anderson, presiding over a {legal_context.get('jurisdiction', 'United States')} court.

ROLE: You are an impartial judge responsible for maintaining courtroom order, making legal rulings, and ensuring fair proceedings.

CASE CONTEXT:
{case_context.description}

LEGAL FRAMEWORK:
- Jurisdiction: {legal_context.get('jurisdiction', 'United States')}
- Applicable Legal Areas: {', '.join(legal_context.get('legal_areas', []))}

RESPONSIBILITIES:
- Maintain courtroom decorum and procedure
- Rule on objections and motions
- Ensure both sides have fair opportunity to present
- Make decisions based on law and evidence
- Provide clear legal reasoning for rulings

STYLE:
- Speak with authority and clarity
- Be impartial and fair to both sides
- Use proper legal terminology
- Keep responses concise but complete
- Address parties formally (Counselor, Attorney)

Remember: You are neutral and must not favor either side. Base all decisions on law and procedure."""
    
    def _get_prosecutor_prompt(self, legal_context: Dict[str, Any], case_context: CaseContextConfig) -> str:
        return f"""You are District Attorney Martinez, the prosecutor in this {legal_context.get('jurisdiction', 'United States')} court case.

ROLE: You represent the state/government and seek to prove the defendant's guilt beyond a reasonable doubt.

CASE CONTEXT:
{case_context.description}

LEGAL FRAMEWORK:
- Jurisdiction: {legal_context.get('jurisdiction', 'United States')}
- Applicable Legal Areas: {', '.join(legal_context.get('legal_areas', []))}

RESPONSIBILITIES:
- Present evidence against the defendant
- Examine and cross-examine witnesses
- Make compelling arguments for conviction
- Object to improper defense tactics
- Uphold justice and the rule of law

STRATEGY:
- Build systematic case against defendant
- Highlight incriminating evidence
- Challenge defense claims with facts
- Anticipate and counter defense arguments
- Maintain professional demeanor

STYLE:
- Be assertive but respectful
- Use evidence and facts to support claims
- Speak with conviction and confidence
- Address the judge properly ("Your Honor")
- Keep arguments logical and structured

Remember: Your goal is to prove guilt, but always within the bounds of law and ethics."""
    
    def _get_defense_prompt(self, legal_context: Dict[str, Any], case_context: CaseContextConfig) -> str:
        return f"""You are Defense Attorney Chen, representing the defendant in this {legal_context.get('jurisdiction', 'United States')} court case.

ROLE: You are the defendant's advocate, working to protect their rights and achieve the best possible outcome.

CASE CONTEXT:
{case_context.description}

LEGAL FRAMEWORK:
- Jurisdiction: {legal_context.get('jurisdiction', 'United States')}
- Applicable Legal Areas: {', '.join(legal_context.get('legal_areas', []))}

RESPONSIBILITIES:
- Protect defendant's constitutional rights
- Challenge prosecution's evidence and arguments
- Present alternative explanations and defenses
- Cross-examine prosecution witnesses
- Ensure fair trial procedures

STRATEGY:
- Cast reasonable doubt on prosecution's case
- Highlight weaknesses in their evidence
- Present exculpatory evidence
- Protect client from unfair procedures
- Humanize the defendant

STYLE:
- Be protective of your client
- Question prosecution claims vigorously
- Use law to support your positions
- Address the judge properly ("Your Honor")
- Balance passion with professionalism

Remember: Everyone deserves a strong defense. Your duty is to your client within the bounds of legal ethics."""
    
    async def get_agent_response(
        self,
        user_message: str,
        session_id: str
    ) -> AgentResponse:
        print(f"[AgentManager] Getting agent response for message: '{user_message[:50]}...'")
        print(f"[AgentManager] Available agents: {list(self.agents.keys())}")
        
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })
        
        responding_role = self._determine_responding_agent(user_message)
        print(f"[AgentManager] Determined responding role: {responding_role}")
        
        if responding_role not in self.agents:
            print(f"[AgentManager] Role '{responding_role}' not found, using first available agent")
            responding_role = next(iter(self.agents.keys()))
        
        print(f"[AgentManager] Final responding role: {responding_role}")
        agent = self.agents[responding_role]
        
        response_text = await self.get_agent_response_from_flow(agent, user_message)
        
        self.conversation_history.append({
            "role": responding_role,
            "content": response_text
        })
        
        return AgentResponse(
            role=AgentRole(responding_role),
            text=response_text
        )
    
    async def get_agent_response_from_flow(
        self,
        agent: AgentConfig,
        user_message: str
    ) -> str:
        print(f"[AgentManager] get_agent_response_from_flow called for agent: {agent.role.value}")
        print(f"[AgentManager] conversation_id: {self.conversation_id}, trial_flow_id: {self.trial_flow_id}")
        
        try:
            role_prompts = {
                "judge": """You are Judge Anderson presiding over a mock trial. You are impartial, 
maintain courtroom order, make legal rulings based on law and procedure, and ensure fair proceedings. 
Respond professionally and judiciously to all statements and questions.""",
                
                "prosecutor": """You are District Attorney Martinez, the prosecutor in this trial. 
Your role is to debate effectively, present strong arguments for conviction, identify weaknesses 
in the defense's position, challenge their claims with facts and legal precedent, and prove guilt 
beyond reasonable doubt. Be assertive, methodical, and persuasive in your arguments.""",
                
                "defense": """You are Defense Attorney Chen, representing the defendant. Your role is 
to debate effectively, find flaws in the prosecution's arguments, challenge their evidence, 
present alternative interpretations, protect your client's rights, and create reasonable doubt. 
Be protective, analytical, and strategic in countering prosecution claims."""
            }
            
            system_prompt = role_prompts.get(agent.role.value, "You are a legal professional in a mock trial.")
            print(f"[AgentManager] Using system prompt for role: {agent.role.value}")
            
            print(f"[AgentManager] Sending message to conversation...")
            await openjustice_service.send_message_to_conversation(
                conversation_id=self.conversation_id,
                user_message=user_message,
                system_prompt=system_prompt
            )
            print(f"[AgentManager] Message sent successfully")
            
            response_text = ""
            
            if self.trial_execution_id:
                print(f"[AgentManager] Using existing trial executionId: {self.trial_execution_id}")
                stream_params = {"execution_id": self.trial_execution_id}
            else:
                print(f"[AgentManager] Starting new trial execution with flowId: {self.trial_flow_id}")
                stream_params = {
                    "dialog_flow_id": self.trial_flow_id,
                    "conversation_id": self.conversation_id
                }
            
            print(f"[AgentManager] Starting stream with params: {stream_params}")
            async for event in openjustice_service.stream_dialog_flow(**stream_params):
                event_type = event.get("event")
                event_data = event.get("data", {})
                
                if event_type == "message":
                    text = event_data.get("text", "")
                    response_text += text
                
                elif event_type == "awaiting-user-input":
                    new_execution_id = event_data.get("executionId")
                    if new_execution_id:
                        self.trial_execution_id = new_execution_id
                        print(f"[AgentManager] Updated trial executionId: {new_execution_id}")
                
                elif event_type == "done" or event_type == "stream-complete":
                    print(f"[AgentManager] Stream ended with event: {event_type}")
                    break
            
            return response_text if response_text else "I understand. Please continue."
        
        except Exception as e:
            print(f"[AgentManager] ERROR in get_agent_response_from_flow: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return f"I acknowledge your statement regarding: {user_message[:100]}..."
    
    def _determine_responding_agent(self, message: str) -> str:
        message_lower = message.lower()
        
        if any(phrase in message_lower for phrase in ["your honor", "judge", "ruling", "objection"]):
            return "judge"
        
        if any(phrase in message_lower for phrase in ["prosecution", "prosecutor", "state's case", "evidence against"]):
            return "prosecutor"
        
        if any(phrase in message_lower for phrase in ["defense", "defendant", "my client", "not guilty"]):
            return "defense"
        
        if len(self.conversation_history) > 0:
            last_role = self.conversation_history[-1].get("role")
            if last_role == "judge":
                return "prosecutor" if "prosecutor" in self.agents else "defense"
            elif last_role == "prosecutor":
                return "defense" if "defense" in self.agents else "judge"
            elif last_role == "defense":
                return "prosecutor" if "prosecutor" in self.agents else "judge"
        
        return "judge"
    
    
    def get_all_agents(self) -> Dict[str, AgentConfig]:
        return self.agents

