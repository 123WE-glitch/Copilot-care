import { ErrorCode } from '@copilot-care/shared/types';

export interface ConsentValidationResult {
  ok: boolean;
  errorCode?: ErrorCode;
  message?: string;
  requiredFields?: string[];
}

function parseAllowlist(envValue: string | undefined): string[] {
  if (!envValue) {
    return [];
  }
  return envValue
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isFormatValid(token: string): boolean {
  if (!token.startsWith('consent_')) {
    return false;
  }
  return /^[a-zA-Z0-9_.:-]{12,}$/.test(token);
}

export class ConsentValidationService {
  private readonly allowlist: Set<string>;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const defaults = ['consent_local_demo'];
    const configured = parseAllowlist(env.COPILOT_CARE_CONSENT_TOKEN_ALLOWLIST);
    this.allowlist = new Set([...defaults, ...configured]);
  }

  public validate(consentToken: string | undefined): ConsentValidationResult {
    const token = typeof consentToken === 'string' ? consentToken.trim() : '';
    if (!token) {
      return {
        ok: false,
        errorCode: 'ERR_MISSING_REQUIRED_DATA',
        message: '缺少 consentToken，无法完成授权校验。',
        requiredFields: ['consentToken'],
      };
    }

    if (!isFormatValid(token)) {
      return {
        ok: false,
        errorCode: 'ERR_MISSING_REQUIRED_DATA',
        message: 'consentToken 格式无效。',
        requiredFields: ['consentToken'],
      };
    }

    if (!this.allowlist.has(token)) {
      return {
        ok: false,
        errorCode: 'ERR_MISSING_REQUIRED_DATA',
        message: 'consentToken 未授权。',
        requiredFields: ['consentToken'],
      };
    }

    return { ok: true };
  }
}
