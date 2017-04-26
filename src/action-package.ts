

export interface ActionPackage {
  versionLabel: string;
  agentInfo: AgentInfo;
  actions: Action[];
}

export interface AgentInfo {
  languageCode: 'en-US' | string;
  projectId: string;
  voiceName: 'male_1' | 'male_2' | 'female_1' | 'female_2';
  logoURL?: string;
  accountLinking?: AccountLinking;
}

export interface AccountLinking {
  clientId: string;
  clientSecret: string;
  grantType: string;
  authenticationUrl: string;
  accessTokenUrl: string;
  scropes: string[];
}

export interface Action {
  description?: string;
  initialTrigger: LaunchTrigger | Trigger;
  httpExecution: HttpExecution;
}

export interface LaunchTrigger {
  intent: 'assistant.intent.action.MAIN';
}

export interface Trigger {
  intent: string;
  queryPatterns: QueryPattern[];
}

export interface QueryPattern {
  queryPattern: string;
}

export interface HttpExecution {
  url: string;
}

export interface CustomType {
  name: string;
  items: Array<{
    key: string;
    synonyms: string[];
  }>;
}

export const SCHEMA_DATE = '$SchemaOrg_Date';
export const SCHEMA_NUMBER = '$SchemaOrg_Number';
export const SCHEMA_TIME = '$SchemaOrg_Time';
