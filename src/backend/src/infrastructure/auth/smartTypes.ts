export type SmartRole = 'patient' | 'user' | 'system';
export type SmartPermission = 'read' | 'write' | '*';

export interface SmartScope {
  role: SmartRole;
  resource: string;
  permission: SmartPermission;
}

export interface IntrospectionResponse {
  active: boolean;
  scope: string;
  client_id?: string;
  username?: string;
  sub?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
}

export interface SmartContext {
  patientId?: string;
  encounterId?: string;
  locationId?: string;
}
