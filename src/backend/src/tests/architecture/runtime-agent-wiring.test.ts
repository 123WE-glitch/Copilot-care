import { createRuntime } from '../../bootstrap/createRuntime';

describe('Architecture Smoke - runtime wiring', () => {
  it('exposes all expert roles in runtime architecture snapshot', () => {
    const runtime = createRuntime();
    const expertKeys = Object.keys(runtime.architecture.experts).sort();
    expect(expertKeys).toEqual([
      'cardiology',
      'generalPractice',
      'metabolic',
      'safety',
    ]);
  });

  it('includes metabolic expert in orchestration round opinions', async () => {
    const runtime = createRuntime();
    const result = await runtime.triageUseCase.execute({
      profile: {
        patientId: 'runtime-wiring-001',
        age: 42,
        sex: 'female',
        symptoms: ['fatigue'],
        chronicDiseases: ['Prediabetes'],
        medicationHistory: ['none'],
        vitals: {
          systolicBP: 142,
          diastolicBP: 91,
        },
      },
      symptomText: 'fatigue',
      signals: [
        {
          timestamp: '2026-02-21T08:00:00Z',
          source: 'manual',
          systolicBP: 142,
          diastolicBP: 91,
        },
      ],
      consentToken: 'consent_local_demo',
    });

    expect(result.rounds.length).toBeGreaterThan(0);
    const firstRoundRoles = result.rounds[0].opinions.map((opinion) => opinion.role);
    expect(firstRoundRoles).toContain('Metabolic');
  });
});
