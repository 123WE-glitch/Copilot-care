import {
  evaluateStopLoss,
  GovernanceFailureSignal,
} from '../../infrastructure/governance/stopLossGuard';

function createSignal(
  signalId: string,
  severity: 'high' | 'critical',
  occurredAt: string,
  releaseBlocked: boolean,
): GovernanceFailureSignal {
  return {
    signalId,
    signalType: 'gate',
    severity,
    occurredAt,
    releaseBlocked,
  };
}

describe('Architecture Smoke - stop-loss and rollback guard', () => {
  it('triggers stop-loss on consecutive critical failures', () => {
    const signals: GovernanceFailureSignal[] = [
      createSignal('S-001', 'high', '2026-02-21T09:00:00.000Z', true),
      createSignal('S-002', 'critical', '2026-02-21T09:05:00.000Z', true),
      createSignal('S-003', 'critical', '2026-02-21T09:10:00.000Z', true),
    ];

    const decision = evaluateStopLoss({
      signals,
      currentVersion: 'v1.1',
      stableVersion: 'v1.0',
      now: () => new Date('2026-02-21T09:12:00.000Z'),
    });

    expect(decision.triggered).toBe(true);
    expect(decision.freezeExpansion).toBe(true);
    expect(decision.rollbackRequired).toBe(true);
    expect(decision.retestRequired).toBe(true);
    expect(decision.rollbackTargetVersion).toBe('v1.0');
    expect(decision.consecutiveCriticalCount).toBe(2);
  });

  it('triggers stop-loss on release-block failure count in rolling window', () => {
    const signals: GovernanceFailureSignal[] = [
      createSignal('S-010', 'high', '2026-02-21T10:00:00.000Z', true),
      createSignal('S-011', 'high', '2026-02-21T10:12:00.000Z', true),
      createSignal('S-012', 'high', '2026-02-21T10:20:00.000Z', true),
    ];

    const decision = evaluateStopLoss({
      signals,
      currentVersion: 'v1.1',
      stableVersion: 'v1.0',
      now: () => new Date('2026-02-21T10:25:00.000Z'),
    });

    expect(decision.triggered).toBe(true);
    expect(decision.releaseBlockCountInWindow).toBe(3);
    expect(decision.reason).toContain('release-block failures in window');
  });

  it('does not trigger stop-loss when below threshold', () => {
    const signals: GovernanceFailureSignal[] = [
      createSignal('S-101', 'high', '2026-02-21T11:00:00.000Z', true),
      createSignal('S-102', 'critical', '2026-02-21T11:10:00.000Z', true),
      createSignal('S-103', 'high', '2026-02-21T11:20:00.000Z', false),
    ];

    const decision = evaluateStopLoss({
      signals,
      currentVersion: 'v1.1',
      stableVersion: 'v1.0',
      now: () => new Date('2026-02-21T11:25:00.000Z'),
    });

    expect(decision.triggered).toBe(false);
    expect(decision.freezeExpansion).toBe(false);
    expect(decision.rollbackRequired).toBe(false);
    expect(decision.retestRequired).toBe(false);
    expect(decision.reason).toBe('no stop-loss trigger met');
  });
});
