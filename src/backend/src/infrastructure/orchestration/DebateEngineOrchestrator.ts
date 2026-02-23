import {
  DebateResult,
  DebateRound,
  TriageRequest,
} from '@copilot-care/shared/types';
import { DebateEngine } from '../../core/DebateEngine';
import {
  OrchestratorRunOptions,
  TriageOrchestratorPort,
} from '../../application/ports/TriageOrchestratorPort';

function formatRoundReasoning(round: DebateRound): string {
  return `第${round.roundNumber}轮：分歧指数=${round.dissentIndex.toFixed(3)}，分歧等级=${round.dissentBand}`;
}

export class DebateEngineOrchestrator implements TriageOrchestratorPort {
  private readonly engine: DebateEngine;

  constructor(engine: DebateEngine) {
    this.engine = engine;
  }

  public async runSession(
    input: TriageRequest,
    options?: OrchestratorRunOptions,
  ): Promise<DebateResult> {
    const sessionId =
      input.requestId?.trim() || input.sessionId?.trim() || undefined;
    return this.engine.runSession(input.profile, sessionId, {
      onRoundCompleted: (round) => {
        options?.onReasoningStep?.(formatRoundReasoning(round));
      },
    });
  }
}
