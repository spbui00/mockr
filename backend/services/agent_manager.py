from typing import Dict, List, Any, Optional
from models.agents import AgentRole, AgentConfig, AgentResponse
from models.trial import RoleType, LegalPropertiesConfig, CaseContextConfig
import json
import re

class AgentManager:
    def __init__(self):
        self.agents: Dict[str, AgentConfig] = {}
        self.conversation_history: List[Dict[str, str]] = []
    
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
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })
        
        responding_role = self._determine_responding_agent(user_message)
        
        if responding_role not in self.agents:
            responding_role = "judge"
        
        agent = self.agents[responding_role]
        
        response_text = await self._generate_response(agent, user_message)
        
        self.conversation_history.append({
            "role": responding_role,
            "content": response_text
        })
        
        return AgentResponse(
            role=AgentRole(responding_role),
            text=response_text
        )
    
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
    
    async def _generate_response(self, agent: AgentConfig, message: str) -> str:
        context = "\n".join([
            f"{msg['role']}: {msg['content']}" 
            for msg in self.conversation_history[-10:]
        ])
        
        prompt = f"{agent.system_prompt}\n\nCONVERSATION HISTORY:\n{context}\n\nUSER: {message}\n\n{agent.name.upper()}:"
        
        simulated_responses = {
            "judge": [
                "Counselor, please proceed with your argument. The court is listening.",
                "Objection noted. I'll allow it, but please be mindful of relevance.",
                "Let's maintain order in this courtroom. Continue, counselor.",
                "The court finds this line of questioning appropriate. You may proceed.",
            ],
            "prosecutor": [
                "Your Honor, the evidence clearly demonstrates the defendant's culpability in this matter.",
                "I object to that characterization. The facts speak for themselves.",
                "The state has presented compelling evidence that establishes guilt beyond reasonable doubt.",
                "Your Honor, may I redirect? The witness's testimony is crucial to our case.",
            ],
            "defense": [
                "Your Honor, the prosecution has failed to meet their burden of proof.",
                "Objection! This line of questioning is prejudicial and irrelevant.",
                "My client maintains their innocence, and the evidence supports that position.",
                "Your Honor, I move to strike that statement as it assumes facts not in evidence.",
            ]
        }
        
        role_key = agent.role.value
        responses = simulated_responses.get(role_key, ["I understand. Let me respond appropriately."])
        
        import random
        return random.choice(responses)
    
    def get_all_agents(self) -> Dict[str, AgentConfig]:
        return self.agents

