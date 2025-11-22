export enum RoleType {
  JUDGE = 'judge',
  PROSECUTOR = 'prosecutor',
  DEFENSE = 'defense',
}

export interface RoleConfig {
  role: RoleType;
  enabled: boolean;
}

export interface LegalPropertiesConfig {
  jurisdiction: string;
  legal_areas: string[];
  articles: string[];
  case_law: string[];
}

export interface CaseContextConfig {
  description: string;
  documents: string[];
  additional_info: Record<string, any>;
}

export interface CreateTrialRequest {
  roles: RoleConfig[];
  legal_properties: LegalPropertiesConfig;
  case_context: CaseContextConfig;
}

export interface Agent {
  role: RoleType;
  name: string;
  traits: string[];
}

export interface TrialMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  role?: RoleType;
  content: string;
  timestamp: string;
}

export interface WebSocketMessage {
  type: string;
  message?: string;
  content?: string;
  role?: RoleType;
  text?: string;
  audio?: string;
  timestamp?: string;
}

