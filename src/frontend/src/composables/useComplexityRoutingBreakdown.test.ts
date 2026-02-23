import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useComplexityRoutingBreakdown } from './useComplexityRoutingBreakdown';

const ROUTE_MODE_LABELS: Record<string, string> = {
  FAST_CONSENSUS: '快速共识',
  LIGHT_DEBATE: '轻度辩论',
  DEEP_DEBATE: '深度辩论',
  ESCALATE_TO_OFFLINE: '线下上转',
};

function createState() {
  const routing = ref<{
    routeMode?: string;
    department?: string;
    collaborationMode?: string;
    complexityScore?: number;
    reasons?: string[];
  }>();
  const hasRedFlag = ref(false);

  const state = useComplexityRoutingBreakdown({
    routing,
    hasRedFlag,
    routeModeLabels: ROUTE_MODE_LABELS,
  });

  return { routing, hasRedFlag, state };
}

describe('useComplexityRoutingBreakdown', () => {
  it('returns safe fallback output when complexity score is missing', () => {
    const { state } = createState();

    expect(state.complexityScore.value).toBeUndefined();
    expect(state.corridorPointerPercent.value).toBeNull();
    expect(state.boundaryDistanceText.value).toContain('等待复杂度评分');
    expect(state.factorBreakdown.value.every((item) => item.score === 0)).toBe(true);
  });

  it('builds factorized score and aligned corridor for medium complexity route', () => {
    const { routing, state } = createState();

    routing.value = {
      routeMode: 'LIGHT_DEBATE',
      department: 'cardiology',
      complexityScore: 4.8,
      reasons: ['症状持续', '既往慢病史'],
    };

    const factorTotal = state.factorBreakdown.value
      .map((item) => item.score)
      .reduce((sum, score) => sum + score, 0);

    expect(state.expectedRouteLabel.value).toBe('轻度辩论');
    expect(state.routeAlignmentText.value).toContain('一致');
    expect(state.corridorPointerPercent.value).toBeCloseTo(48, 0);
    expect(factorTotal).toBeCloseTo(4.8, 1);
  });

  it('marks red-flag override and exposes explicit boundary warning', () => {
    const { routing, hasRedFlag, state } = createState();

    routing.value = {
      routeMode: 'ESCALATE_TO_OFFLINE',
      department: 'multiDisciplinary',
      complexityScore: 5.2,
      reasons: ['红旗症状触发'],
    };
    hasRedFlag.value = true;

    expect(state.routeAlignmentText.value).toContain('红旗优先');
    expect(state.boundaryDistanceText.value).toContain('红旗症状触发');
  });

  it('highlights mismatch when route mode deviates from complexity corridor', () => {
    const { routing, state } = createState();

    routing.value = {
      routeMode: 'FAST_CONSENSUS',
      complexityScore: 6.4,
      reasons: ['症状恶化'],
    };

    expect(state.expectedRouteLabel.value).toBe('深度辩论');
    expect(state.routeAlignmentText.value).toContain('偏移');
    expect(state.boundaryDistanceText.value).toContain('不一致');
  });
});
