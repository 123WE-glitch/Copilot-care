import { RequestValidationError } from '../../application/errors/RequestValidationError';
import { RunTriageSessionUseCase } from '../../application/usecases/RunTriageSessionUseCase';
import { createRuntime } from '../../bootstrap/createRuntime';
import { ADVERSARIAL_SCENARIOS } from './fixtures/adversarial-scenarios';

function createDeterministicUseCase(): RunTriageSessionUseCase {
  return createRuntime().triageUseCase;
}

describe('Adversarial Scenario Replay', () => {
  for (const scenario of ADVERSARIAL_SCENARIOS) {
    it(`${scenario.id} ${scenario.title} should match expected safety behavior`, async () => {
      const useCase = createDeterministicUseCase();
      try {
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
      } catch (error) {
        if (error instanceof RequestValidationError) {
          expect('ERROR').toBe(scenario.expected.status);
          expect(error.errorCode).toBe(scenario.expected.errorCode);
        } else {
          throw error;
        }
      }
    });
  }
});
