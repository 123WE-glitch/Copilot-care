import { parseLLMJsonText } from '../../llm/normalize';

describe('Architecture Smoke - llm normalize', () => {
  it('parses JSON content wrapped in code fence', () => {
    const parsed = parseLLMJsonText(`
\`\`\`json
{
  "riskLevel": "L1",
  "confidence": 0.88,
  "reasoning": "建议先随访观察。",
  "citations": ["分诊建议"],
  "actions": ["一周后复评"]
}
\`\`\`
`);

    expect(parsed).not.toBeNull();
    expect(parsed?.riskLevel).toBe('L1');
    expect(parsed?.confidence).toBe(0.88);
  });

  it('normalizes lowercase risk level and string confidence', () => {
    const parsed = parseLLMJsonText(
      '{"riskLevel":"l2","confidence":"0.67","reasoning":"需加强监测。","citations":[],"actions":[]}',
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.riskLevel).toBe('L2');
    expect(parsed?.confidence).toBe(0.67);
  });

  it('returns null when risk level is invalid', () => {
    const parsed = parseLLMJsonText(
      '{"riskLevel":"HIGH","confidence":0.5,"reasoning":"x","citations":[],"actions":[]}',
    );
    expect(parsed).toBeNull();
  });
});
