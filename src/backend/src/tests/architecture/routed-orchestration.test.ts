import { createRuntime } from '../../bootstrap/createRuntime';

describe('Architecture Smoke - routed orchestration flow', () => {
  it('returns routing metadata and state-machine trace for normal output', async () => {
    const runtime = createRuntime();
    const result = await runtime.triageUseCase.execute({
      profile: {
        patientId: 'routed-flow-normal-001',
        age: 54,
        sex: 'male',
        chiefComplaint: 'mild dizziness',
        symptoms: ['dizziness'],
        chronicDiseases: ['Hypertension'],
        medicationHistory: ['amlodipine'],
        vitals: {
          systolicBP: 146,
          diastolicBP: 92,
        },
      },
      symptomText: 'mild dizziness',
      signals: [
        {
          timestamp: '2026-02-21T09:00:00Z',
          source: 'manual',
          systolicBP: 146,
          diastolicBP: 92,
        },
      ],
      consentToken: 'consent_local_demo',
    });

    expect(result.routing).toBeDefined();
    expect(result.routing?.routeMode).toBe('FAST_CONSENSUS');
    expect(result.routing?.collaborationMode).toBe('SINGLE_SPECIALTY_PANEL');
    expect(result.workflowTrace?.some((stage) => stage.stage === 'ROUTING')).toBe(true);
    expect(result.workflowTrace?.some((stage) => stage.stage === 'REVIEW')).toBe(true);
    expect(result.triageResult).toBeDefined();
    expect(result.explainableReport).toBeDefined();
  });

  it('routes complex input to multidisciplinary deep debate', async () => {
    const runtime = createRuntime();
    const result = await runtime.triageUseCase.execute({
      profile: {
        patientId: 'routed-flow-deep-001',
        age: 71,
        sex: 'female',
        symptoms: ['dizziness', 'fatigue', 'thirst'],
        chronicDiseases: ['Hypertension', 'Diabetes', 'Dyslipidemia'],
        medicationHistory: ['metformin'],
        vitals: {
          systolicBP: 166,
          diastolicBP: 101,
        },
      },
      symptomText: 'dizziness, fatigue, thirst',
      signals: [
        {
          timestamp: '2026-02-21T10:00:00Z',
          source: 'manual',
          systolicBP: 166,
          diastolicBP: 101,
        },
      ],
      consentToken: 'consent_local_demo',
    });

    expect(result.routing).toBeDefined();
    expect(result.routing?.routeMode).toBe('DEEP_DEBATE');
    expect(result.routing?.department).toBe('multiDisciplinary');
    expect(result.routing?.collaborationMode).toBe('MULTI_DISCIPLINARY_CONSULT');
    expect(result.workflowTrace?.some((stage) => stage.stage === 'DEBATE')).toBe(true);
    expect(result.workflowTrace?.some((stage) => stage.stage === 'REVIEW')).toBe(true);
  });

  it('keeps review stage explicit on red-flag escalation path', async () => {
    const runtime = createRuntime();
    const result = await runtime.triageUseCase.execute({
      profile: {
        patientId: 'routed-flow-escalation-001',
        age: 67,
        sex: 'male',
        chiefComplaint: 'chest pain and shortness of breath',
        symptoms: ['chest pain', 'shortness of breath'],
        chronicDiseases: ['Hypertension'],
        medicationHistory: ['amlodipine'],
        vitals: {
          systolicBP: 182,
          diastolicBP: 112,
        },
      },
      symptomText: 'chest pain and shortness of breath',
      consentToken: 'consent_local_demo',
    });

    expect(result.status).toBe('ESCALATE_TO_OFFLINE');
    const reviewStage = result.workflowTrace?.find((stage) => stage.stage === 'REVIEW');
    expect(reviewStage).toBeDefined();
    expect(reviewStage?.status).toBe('skipped');
  });
});
