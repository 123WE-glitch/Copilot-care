import {
  DebateResult,
  PatientProfile,
  TriageRequest,
} from '@copilot-care/shared/types';
import {
  OrchestratorRunOptions,
  TriageOrchestratorPort,
} from '../../application/ports/TriageOrchestratorPort';
import {
  RunTriageSessionUseCase,
  TRIAGE_IDEMPOTENCY_TTL_MS,
} from '../../application/usecases/RunTriageSessionUseCase';

function createProfile(overrides: Partial<PatientProfile> = {}): PatientProfile {
  return {
    patientId: 'patient-001',
    age: 56,
    sex: 'female',
    chronicDiseases: ['hypertension'],
    medicationHistory: ['amlodipine'],
    ...overrides,
  };
}

function createResult(sessionId: string): DebateResult {
  return {
    sessionId,
    status: 'OUTPUT',
    rounds: [],
    dissentIndexHistory: [],
    notes: [],
    auditTrail: [],
  };
}

describe('Architecture Smoke - use case idempotency', () => {
  it('returns cached result for same sessionId and same payload', async () => {
    const runSession = jest
      .fn<Promise<DebateResult>, [TriageRequest, OrchestratorRunOptions?]>()
      .mockResolvedValue(createResult('sess-a'));
    const orchestrator: TriageOrchestratorPort = { runSession };
    const useCase = new RunTriageSessionUseCase(orchestrator);

    const request: TriageRequest = {
      profile: createProfile(),
      sessionId: 'sess-a',
    };

    const first = await useCase.execute(request);
    const second = await useCase.execute(request);

    expect(runSession).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('rejects reuse of same sessionId with different payload', async () => {
    const runSession = jest
      .fn<Promise<DebateResult>, [TriageRequest, OrchestratorRunOptions?]>()
      .mockResolvedValue(createResult('sess-b'));
    const orchestrator: TriageOrchestratorPort = { runSession };
    const useCase = new RunTriageSessionUseCase(orchestrator);

    await useCase.execute({
      profile: createProfile(),
      sessionId: 'sess-b',
    });

    await expect(
      useCase.execute({
        profile: createProfile({ age: 57 }),
        sessionId: 'sess-b',
      }),
    ).rejects.toMatchObject({
      errorCode: 'ERR_CONFLICT_UNRESOLVED',
    });

    expect(runSession).toHaveBeenCalledTimes(1);
  });

  it('recomputes result after idempotency TTL expires', async () => {
    let now = 1000;
    const runSession = jest
      .fn<Promise<DebateResult>, [TriageRequest, OrchestratorRunOptions?]>()
      .mockResolvedValue(createResult('sess-c'));
    const orchestrator: TriageOrchestratorPort = { runSession };
    const useCase = new RunTriageSessionUseCase(orchestrator, () => now);

    const request: TriageRequest = {
      profile: createProfile(),
      sessionId: 'sess-c',
    };

    await useCase.execute(request);
    now += TRIAGE_IDEMPOTENCY_TTL_MS + 1;
    await useCase.execute(request);

    expect(runSession).toHaveBeenCalledTimes(2);
  });

  it('forwards orchestration callbacks when idempotency key is absent', async () => {
    const runSession = jest
      .fn<Promise<DebateResult>, [TriageRequest, OrchestratorRunOptions?]>()
      .mockResolvedValue(createResult('sess-d'));
    const orchestrator: TriageOrchestratorPort = { runSession };
    const useCase = new RunTriageSessionUseCase(orchestrator);

    const request: TriageRequest = {
      profile: createProfile(),
    };
    const options: OrchestratorRunOptions = {
      onWorkflowStage: jest.fn(),
      onReasoningStep: jest.fn(),
    };

    await useCase.execute(request, options);

    expect(runSession).toHaveBeenCalledTimes(1);
    expect(runSession).toHaveBeenCalledWith(request, options);
  });
});
