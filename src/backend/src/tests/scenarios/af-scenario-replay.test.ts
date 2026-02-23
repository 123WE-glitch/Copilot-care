import { RunTriageSessionUseCase } from '../../application/usecases/RunTriageSessionUseCase';
import { createRuntime } from '../../bootstrap/createRuntime';
import { AF_SCENARIOS } from './fixtures/af-scenarios';

function createDeterministicUseCase(): RunTriageSessionUseCase {
  return createRuntime().triageUseCase;
}

describe('Scenario Replay - A-F source of truth', () => {
  const replayCases = AF_SCENARIOS.filter(
    (scenario) => !scenario.expected.expectIdempotentReplay,
  );

  for (const scenario of replayCases) {
    it(`${scenario.id} ${scenario.caseCode} should match expected outcome`, async () => {
      const useCase = createDeterministicUseCase();
      const result = await useCase.execute(scenario.request);

      expect(result.status).toBe(scenario.expected.status);

      if (scenario.expected.errorCode) {
        expect(result.errorCode).toBe(scenario.expected.errorCode);
      }

      if (typeof scenario.expected.minRounds === 'number') {
        expect(result.rounds.length).toBeGreaterThanOrEqual(
          scenario.expected.minRounds,
        );
      }

      if (typeof scenario.expected.maxRounds === 'number') {
        expect(result.rounds.length).toBeLessThanOrEqual(
          scenario.expected.maxRounds,
        );
      }

      if (scenario.expected.requireFinalConsensus) {
        expect(result.finalConsensus).toBeDefined();
      }
    });
  }

  it('T-005 Case-E-001 should keep stable output on replay', async () => {
    const scenario = AF_SCENARIOS.find((item) => item.id === 'T-005');
    expect(scenario).toBeDefined();
    if (!scenario) {
      return;
    }

    const useCase = createDeterministicUseCase();
    const first = await useCase.execute(scenario.request);
    const second = await useCase.execute(scenario.request);

    expect(first.status).toBe(scenario.expected.status);
    if (scenario.expected.errorCode) {
      expect(first.errorCode).toBe(scenario.expected.errorCode);
    }
    expect(second).toBe(first);
  });
});
