export type GovernanceThresholdType = 'min' | 'max';

export interface GovernanceIndicator {
  id: string;
  value: number;
  threshold: number;
  thresholdType: GovernanceThresholdType;
}

export interface KnowledgeSnapshot {
  version: string;
  rulesetId: string;
  capturedAt: string;
}

export interface KnowledgeRollbackRecord {
  fromVersion: string;
  toVersion: string;
  triggeredBy: string[];
  reason: string;
  createdAt: string;
}

export interface KnowledgeReleaseDecision {
  decision: 'KEEP_CANDIDATE' | 'ROLLBACK_TO_BASELINE';
  activeSnapshot: KnowledgeSnapshot;
  breachedIndicatorIds: string[];
  rollbackRecord?: KnowledgeRollbackRecord;
}

export interface EvaluateKnowledgeReleaseInput {
  baseline: KnowledgeSnapshot;
  candidate: KnowledgeSnapshot;
  indicators: GovernanceIndicator[];
  reason: string;
  now?: () => Date;
}

function isIndicatorBreached(indicator: GovernanceIndicator): boolean {
  if (indicator.thresholdType === 'min') {
    return indicator.value < indicator.threshold;
  }
  return indicator.value > indicator.threshold;
}

export function evaluateKnowledgeRelease(
  input: EvaluateKnowledgeReleaseInput,
): KnowledgeReleaseDecision {
  const now = input.now ?? (() => new Date());
  const breachedIndicatorIds = input.indicators
    .filter((indicator) => isIndicatorBreached(indicator))
    .map((indicator) => indicator.id);

  if (breachedIndicatorIds.length === 0) {
    return {
      decision: 'KEEP_CANDIDATE',
      activeSnapshot: input.candidate,
      breachedIndicatorIds,
    };
  }

  return {
    decision: 'ROLLBACK_TO_BASELINE',
    activeSnapshot: input.baseline,
    breachedIndicatorIds,
    rollbackRecord: {
      fromVersion: input.candidate.version,
      toVersion: input.baseline.version,
      triggeredBy: breachedIndicatorIds,
      reason: input.reason,
      createdAt: now().toISOString(),
    },
  };
}
