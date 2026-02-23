import {
  DebateResult,
  DebateRound,
  TriageRequest,
} from '@copilot-care/shared/types';
import { RequestValidationError } from '../errors/RequestValidationError';
import {
  OrchestratorRunOptions,
  TriageOrchestratorPort,
} from '../ports/TriageOrchestratorPort';

interface IdempotencyEntry {
  requestFingerprint: string;
  createdAtMs: number;
  result: DebateResult;
}

export const TRIAGE_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function formatRoundReasoning(round: DebateRound): string {
  return `第${round.roundNumber}轮：分歧指数=${round.dissentIndex.toFixed(3)}，分歧等级=${round.dissentBand}`;
}

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const keys = Object.keys(source).sort();
    const normalized: Record<string, unknown> = {};
    for (const key of keys) {
      normalized[key] = canonicalizeValue(source[key]);
    }
    return normalized;
  }

  return value;
}

function buildRequestFingerprint(input: TriageRequest): string {
  return JSON.stringify({
    profile: canonicalizeValue(input.profile),
    signals: canonicalizeValue(input.signals ?? []),
    symptomText: input.symptomText ?? '',
    contextVersion: input.contextVersion ?? '',
    consentToken: input.consentToken ?? '',
  });
}

function resolveIdempotencyKey(input: TriageRequest): string | undefined {
  const requestId =
    typeof input.requestId === 'string' ? input.requestId.trim() : '';
  if (requestId) {
    return requestId;
  }
  const sessionId =
    typeof input.sessionId === 'string' ? input.sessionId.trim() : '';
  return sessionId || undefined;
}

export class RunTriageSessionUseCase {
  private readonly orchestrator: TriageOrchestratorPort;
  private readonly idempotencyEntries: Map<string, IdempotencyEntry>;
  private readonly now: () => number;

  constructor(
    orchestrator: TriageOrchestratorPort,
    now: () => number = () => Date.now(),
  ) {
    this.orchestrator = orchestrator;
    this.now = now;
    this.idempotencyEntries = new Map();
  }

  private evictExpiredEntries(referenceTimeMs: number): void {
    for (const [sessionId, entry] of this.idempotencyEntries.entries()) {
      if (referenceTimeMs - entry.createdAtMs > TRIAGE_IDEMPOTENCY_TTL_MS) {
        this.idempotencyEntries.delete(sessionId);
      }
    }
  }

  public async execute(
    input: TriageRequest,
    options?: OrchestratorRunOptions,
  ): Promise<DebateResult> {
    const nowMs = this.now();
    this.evictExpiredEntries(nowMs);

    const idempotencyKey = resolveIdempotencyKey(input);
    if (!idempotencyKey) {
      return this.orchestrator.runSession(input, options);
    }

    const requestFingerprint = buildRequestFingerprint(input);
    const existing = this.idempotencyEntries.get(idempotencyKey);
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new RequestValidationError(
          'ERR_CONFLICT_UNRESOLVED',
          'requestId/sessionId already exists with a different payload.',
        );
      }
      if (options?.onWorkflowStage) {
        for (const stage of existing.result.workflowTrace ?? []) {
          options.onWorkflowStage(stage);
        }
      }
      if (options?.onReasoningStep) {
        for (const reason of existing.result.routing?.reasons ?? []) {
          options.onReasoningStep(reason);
        }
        for (const round of existing.result.rounds) {
          options.onReasoningStep(formatRoundReasoning(round));
        }
      }
      return existing.result;
    }

    const result = await this.orchestrator.runSession(input, options);
    this.idempotencyEntries.set(idempotencyKey, {
      requestFingerprint,
      createdAtMs: nowMs,
      result,
    });

    return result;
  }
}
