import {
  buildClinicalSystemPrompt,
  buildClinicalUserPrompt,
} from '../../llm/prompts';

describe('Architecture Smoke - llm prompts', () => {
  it('system prompt contains strict output requirements', () => {
    const prompt = buildClinicalSystemPrompt();
    expect(prompt).toContain('JSON object only');
    expect(prompt).toContain('Simplified Chinese');
    expect(prompt).toContain('"riskLevel": "L0|L1|L2|L3"');
  });

  it('user prompt serializes role and profile context', () => {
    const prompt = buildClinicalUserPrompt({
      role: 'Generalist',
      agentName: 'test-agent',
      focus: 'test-focus',
      context: 'test-context',
      profile: {
        patientId: 'prompt-001',
        age: 40,
        sex: 'male',
        chronicDiseases: [],
        medicationHistory: [],
      },
    });

    const parsed = JSON.parse(prompt) as Record<string, unknown>;
    expect(parsed.role).toBe('Generalist');
    expect(parsed.agentName).toBe('test-agent');
    expect(parsed.patientProfile).toBeDefined();
    expect(parsed.outputRequirements).toBeDefined();
  });
});
