from typing import Dict, List, Any, Optional, Tuple
from models.agents import AgentRole, AgentConfig, AgentResponse
from models.trial import RoleType, LegalPropertiesConfig, CaseContextConfig
from services.openjustice import openjustice_service
from pyagentspec.agent import Agent
from pyagentspec.property import Property
from pyagentspec.llms import OpenAiConfig
import json
import re
import os
from pathlib import Path

class AgentManager:
    def __init__(self, session_id: str = "", conversation_id: str = "", flow_id: str = ""):
        self.agents: Dict[str, AgentConfig] = {}
        self.agent_spec_agents: Dict[str, Agent] = {}
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
        self.agent_spec_agents = {}
        
        for role in roles:
            agent_spec, agent_config = self._create_agent_config(role, legal_context, case_context)
            self.agent_spec_agents[role.value] = agent_spec
            self.agents[role.value] = agent_config
    
    def _create_agent_config(
        self,
        role: RoleType,
        legal_context: Dict[str, Any],
        case_context: CaseContextConfig
    ) -> Tuple[Agent, AgentConfig]:
        jurisdiction_property = Property(
            json_schema={"title": "jurisdiction", "type": "string", "default": legal_context.get('jurisdiction', 'United States')}
        )
        legal_areas_property = Property(
            json_schema={"title": "legal_areas", "type": "array", "items": {"type": "string"}, "default": legal_context.get('legal_areas', [])}
        )
        case_context_property = Property(
            json_schema={"title": "case_context", "type": "string", "default": case_context.description}
        )
        
        llm_config = OpenAiConfig(
            name="OpenJustice API",
            model_id="gpt-4o-mini-2024-07-18"
        )
        
        role_configs = {
            RoleType.JUDGE: {
                "name": "Judge Anderson",
                "system_prompt_template": self._get_judge_prompt_template(),
                "voice_id": "aura-athena-en",
                "personality_traits": ["impartial", "authoritative", "procedural", "fair"]
            },
            RoleType.PROSECUTOR: {
                "name": "District Attorney Martinez",
                "system_prompt_template": self._get_prosecutor_prompt_template(),
                "voice_id": "aura-arcas-en",
                "personality_traits": ["assertive", "methodical", "persuasive", "justice-focused"]
            },
            RoleType.DEFENSE: {
                "name": "Defense Attorney Chen",
                "system_prompt_template": self._get_defense_prompt_template(),
                "voice_id": "aura-angus-en",
                "personality_traits": ["protective", "analytical", "strategic", "client-focused"]
            }
        }
        
        config = role_configs[role]
        
        agent_spec = Agent(
            name=config["name"],
            system_prompt=config["system_prompt_template"],
            llm_config=llm_config,
            inputs=[jurisdiction_property, legal_areas_property, case_context_property]
        )
        
        system_prompt = self._render_system_prompt(
            config["system_prompt_template"],
            legal_context,
            case_context
        )
        
        agent_config = AgentConfig(
            role=AgentRole(role.value),
            name=config["name"],
            system_prompt=system_prompt,
            voice_id=config["voice_id"],
            personality_traits=config["personality_traits"],
            legal_context=legal_context,
            case_context=case_context.description
        )
        
        return agent_spec, agent_config
    
    def _get_judge_prompt_template(self) -> str:
        return """You are Judge Anderson, presiding over a {{jurisdiction}} court.

ROLE: You are an impartial judge responsible for maintaining courtroom order, making legal rulings, and ensuring fair proceedings.

CASE CONTEXT:
{{case_context}}

LEGAL FRAMEWORK:
- Jurisdiction: {{jurisdiction}}
- Applicable Legal Areas: {{legal_areas}}

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
    
    def _get_judge_prompt(self, legal_context: Dict[str, Any], case_context: CaseContextConfig) -> str:
        return self._render_system_prompt(
            self._get_judge_prompt_template(),
            legal_context,
            case_context
        )
    
    def _get_prosecutor_prompt_template(self) -> str:
        return """You are District Attorney Martinez, the prosecutor in this {{jurisdiction}} court case.

ROLE: You represent the state/government and seek to prove the defendant's guilt beyond a reasonable doubt.

CASE CONTEXT:
{{case_context}}

LEGAL FRAMEWORK:
- Jurisdiction: {{jurisdiction}}
- Applicable Legal Areas: {{legal_areas}}

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
    
    def _get_prosecutor_prompt(self, legal_context: Dict[str, Any], case_context: CaseContextConfig) -> str:
        return self._render_system_prompt(
            self._get_prosecutor_prompt_template(),
            legal_context,
            case_context
        )
    
    def _get_defense_prompt_template(self) -> str:
        return """You are Defense Attorney Chen, representing the defendant in this {{jurisdiction}} court case.

ROLE: You are the defendant's advocate, working to protect their rights and achieve the best possible outcome.

CASE CONTEXT:
{{case_context}}

LEGAL FRAMEWORK:
- Jurisdiction: {{jurisdiction}}
- Applicable Legal Areas: {{legal_areas}}

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
    
    def _get_defense_prompt(self, legal_context: Dict[str, Any], case_context: CaseContextConfig) -> str:
        return self._render_system_prompt(
            self._get_defense_prompt_template(),
            legal_context,
            case_context
        )
    
    def _render_system_prompt(
        self,
        template: str,
        legal_context: Dict[str, Any],
        case_context: CaseContextConfig
    ) -> str:
        jurisdiction = legal_context.get('jurisdiction', 'United States')
        legal_areas = legal_context.get('legal_areas', [])
        case_context_str = case_context.description
        
        legal_areas_str = ', '.join(legal_areas) if legal_areas else ''
        
        prompt = template.replace('{{jurisdiction}}', jurisdiction)
        prompt = prompt.replace('{{case_context}}', case_context_str)
        prompt = prompt.replace('{{legal_areas}}', legal_areas_str)
        
        return prompt
    
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
            system_prompt = agent.system_prompt
            print(f"[AgentManager] Using system prompt from Agent Spec for role: {agent.role.value}")
            
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
    
    def export_agent_specs_to_json(self, output_dir: str = "agent_specs") -> Dict[str, str]:
        """Export all Agent Spec agents to JSON files.
        
        Args:
            output_dir: Directory to save the JSON files (default: "agent_specs")
            
        Returns:
            Dictionary mapping role names to file paths
        """
        os.makedirs(output_dir, exist_ok=True)
        exported_files = {}
        
        for role, agent_spec in self.agent_spec_agents.items():
            agent_json = agent_spec.to_json()
            file_path = os.path.join(output_dir, f"{role}_agent.json")
            
            with open(file_path, 'w') as f:
                f.write(agent_json)
            
            exported_files[role] = file_path
            print(f"[AgentManager] Exported {role} agent spec to {file_path}")
        
        return exported_files
    
    def export_agent_specs_to_yaml(self, output_dir: str = "agent_specs") -> Dict[str, str]:
        """Export all Agent Spec agents to YAML files.
        
        Args:
            output_dir: Directory to save the YAML files (default: "agent_specs")
            
        Returns:
            Dictionary mapping role names to file paths
        """
        try:
            import yaml
        except ImportError:
            raise ImportError("PyYAML is required for YAML export. Install it with: pip install pyyaml")
        
        os.makedirs(output_dir, exist_ok=True)
        exported_files = {}
        
        for role, agent_spec in self.agent_spec_agents.items():
            agent_dict = json.loads(agent_spec.to_json())
            file_path = os.path.join(output_dir, f"{role}_agent.yaml")
            
            with open(file_path, 'w') as f:
                yaml.dump(agent_dict, f, default_flow_style=False, sort_keys=False)
            
            exported_files[role] = file_path
            print(f"[AgentManager] Exported {role} agent spec to {file_path}")
        
        return exported_files
    
    def get_agent_spec_json(self, role: str) -> Optional[str]:
        """Get the JSON representation of an Agent Spec agent.
        
        Args:
            role: The role name (judge, prosecutor, or defense)
            
        Returns:
            JSON string representation of the agent, or None if not found
        """
        if role in self.agent_spec_agents:
            return self.agent_spec_agents[role].to_json()
        return None

