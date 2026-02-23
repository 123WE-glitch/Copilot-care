import { resolveClinicalLLMTransportPolicy } from '../../llm/createClinicalLLMClient';

describe('Architecture Smoke - llm transport policy', () => {
  it('returns defaults when env vars are missing', () => {
    const policy = resolveClinicalLLMTransportPolicy({});
    expect(policy.timeoutMs).toBe(300000);
    expect(policy.maxRetries).toBe(1);
    expect(policy.retryDelayMs).toBe(300);
  });

  it('uses env overrides when values are valid', () => {
    const policy = resolveClinicalLLMTransportPolicy({
      COPILOT_CARE_LLM_TIMEOUT_MS: '18000',
      COPILOT_CARE_LLM_MAX_RETRIES: '1',
      COPILOT_CARE_LLM_RETRY_DELAY_MS: '500',
    });
    expect(policy.timeoutMs).toBe(18000);
    expect(policy.maxRetries).toBe(1);
    expect(policy.retryDelayMs).toBe(500);
  });

  it('falls back when env values are invalid', () => {
    const policy = resolveClinicalLLMTransportPolicy({
      COPILOT_CARE_LLM_TIMEOUT_MS: '-1',
      COPILOT_CARE_LLM_MAX_RETRIES: '-5',
      COPILOT_CARE_LLM_RETRY_DELAY_MS: 'abc',
    });
    expect(policy.timeoutMs).toBe(300000);
    expect(policy.maxRetries).toBe(1);
    expect(policy.retryDelayMs).toBe(300);
  });
});
