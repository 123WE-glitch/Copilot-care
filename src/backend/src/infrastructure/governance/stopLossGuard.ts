export type GovernanceSignalType = 'metric' | 'gate' | 'runtime';

export type GovernanceSignalSeverity = 'high' | 'critical';

export interface GovernanceFailureSignal {
  signalId: string;
  signalType: GovernanceSignalType;
  severity: GovernanceSignalSeverity;
  occurredAt: string;
  releaseBlocked: boolean;
}

export interface StopLossPolicy {
  consecutiveCriticalLimit: number;
  releaseBlockCountLimit: number;
  rollingWindowMinutes: number;
}

export interface StopLossDecision {
  triggered: boolean;
  reason: string;
  freezeExpansion: boolean;
  rollbackRequired: boolean;
  retestRequired: boolean;
  currentVersion: string;
  rollbackTargetVersion: string;
  consecutiveCriticalCount: number;
  releaseBlockCountInWindow: number;
}

const DEFAULT_POLICY: StopLossPolicy = {
  consecutiveCriticalLimit: 2,
  releaseBlockCountLimit: 3,
  rollingWindowMinutes: 30,
};

function toTimeMs(value: string): number {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return 0;
  }
  return time;
}

function compareByTimeAscending(
  left: GovernanceFailureSignal,
  right: GovernanceFailureSignal,
): number {
  return toTimeMs(left.occurredAt) - toTimeMs(right.occurredAt);
}

function computeConsecutiveCriticalCount(
  sortedSignals: GovernanceFailureSignal[],
): number {
  let count = 0;
  for (let index = sortedSignals.length - 1; index >= 0; index -= 1) {
    if (sortedSignals[index].severity !== 'critical') {
      break;
    }
    count += 1;
  }
  return count;
}

function computeReleaseBlockCountInWindow(
  sortedSignals: GovernanceFailureSignal[],
  nowMs: number,
  windowMinutes: number,
): number {
  const windowStart = nowMs - windowMinutes * 60 * 1000;
  return sortedSignals.filter((signal) => {
    if (!signal.releaseBlocked) {
      return false;
    }
    const occurredAtMs = toTimeMs(signal.occurredAt);
    return occurredAtMs >= windowStart && occurredAtMs <= nowMs;
  }).length;
}

export interface EvaluateStopLossInput {
  signals: GovernanceFailureSignal[];
  currentVersion: string;
  stableVersion: string;
  policy?: Partial<StopLossPolicy>;
  now?: () => Date;
}

export function evaluateStopLoss(input: EvaluateStopLossInput): StopLossDecision {
  const policy: StopLossPolicy = {
    ...DEFAULT_POLICY,
    ...(input.policy ?? {}),
  };
  const now = input.now ?? (() => new Date());
  const nowMs = now().getTime();
  const sortedSignals = [...input.signals].sort(compareByTimeAscending);

  const consecutiveCriticalCount =
    computeConsecutiveCriticalCount(sortedSignals);
  const releaseBlockCountInWindow = computeReleaseBlockCountInWindow(
    sortedSignals,
    nowMs,
    policy.rollingWindowMinutes,
  );

  const criticalTriggered =
    consecutiveCriticalCount >= policy.consecutiveCriticalLimit;
  const windowTriggered =
    releaseBlockCountInWindow >= policy.releaseBlockCountLimit;
  const triggered = criticalTriggered || windowTriggered;

  const reason = triggered
    ? criticalTriggered
      ? `consecutive critical failures reached ${consecutiveCriticalCount}`
      : `release-block failures in window reached ${releaseBlockCountInWindow}`
    : 'no stop-loss trigger met';

  return {
    triggered,
    reason,
    freezeExpansion: triggered,
    rollbackRequired: triggered && input.currentVersion !== input.stableVersion,
    retestRequired: triggered,
    currentVersion: input.currentVersion,
    rollbackTargetVersion: input.stableVersion,
    consecutiveCriticalCount,
    releaseBlockCountInWindow,
  };
}
