import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import type { OrchestrationSnapshot } from '@copilot-care/shared/types';
import { useDecisionReasoningCockpit } from './useDecisionReasoningCockpit';

const ROUTE_MODE_LABELS: Record<string, string> = {
  FAST_CONSENSUS: '快速共识',
  LIGHT_DEBATE: '轻度辩论',
  DEEP_DEBATE: '深度辩论',
  ESCALATE_TO_OFFLINE: '线下上转',
};

function createSnapshot(overrides?: Partial<OrchestrationSnapshot>): OrchestrationSnapshot {
  return {
    coordinator: '总Agent',
    phase: 'execution',
    summary: '协同执行中',
    tasks: [
      {
        taskId: 'task-1',
        roleId: 'planner',
        roleName: '计划Agent',
        objective: '整合证据',
        status: 'done',
        progress: 100,
      },
      {
        taskId: 'task-2',
        roleId: 'safety',
        roleName: '安全审校Agent',
        objective: '复核风险边界',
        status: 'done',
        progress: 100,
      },
      {
        taskId: 'task-3',
        roleId: 'diag',
        roleName: '诊断Agent',
        objective: '汇总结论',
        status: 'running',
        progress: 75,
      },
    ],
    graph: {
      nodes: [],
      edges: [],
    },
    generatedAt: '2026-02-23T00:00:00.000Z',
    source: 'model',
    ...overrides,
  };
}

function createCockpitState() {
  const routeInfo = ref(null);
  const routingPreview = ref({
    routeMode: undefined as string | undefined,
    department: undefined as string | undefined,
    collaborationMode: undefined as string | undefined,
    complexityScore: undefined as number | undefined,
  });
  const explainableReport = ref(null);
  const reasoningItems = ref<Array<{ kind: 'system' | 'evidence' | 'decision' | 'warning' | 'query'; text: string }>>([]);
  const orchestrationSnapshot = ref<OrchestrationSnapshot | null>(null);

  const cockpit = useDecisionReasoningCockpit({
    routeInfo,
    routingPreview,
    explainableReport,
    reasoningItems,
    orchestrationSnapshot,
    routeModeLabels: ROUTE_MODE_LABELS,
  });

  return {
    routeInfo,
    routingPreview,
    explainableReport,
    reasoningItems,
    orchestrationSnapshot,
    cockpit,
  };
}

describe('useDecisionReasoningCockpit', () => {
  it('returns stable fallback values when runtime data is missing', () => {
    const { cockpit } = createCockpitState();

    expect(cockpit.confidenceBadge.value.level).toBe('low');
    expect(cockpit.contributionCards.value).toHaveLength(4);
    expect(cockpit.contributionCards.value[0].summary).toContain('等待会诊数据');
    expect(cockpit.evidenceDigest.value.total).toBe(0);
    expect(cockpit.evidenceDigest.value.summary).toContain('暂无关键证据');
  });

  it('raises confidence and contribution scores when evidence and routing are complete', () => {
    const state = createCockpitState();

    state.routeInfo.value = {
      complexityScore: 4.2,
      routeMode: 'LIGHT_DEBATE',
      department: 'cardiology',
      collaborationMode: 'SINGLE_SPECIALTY_PANEL',
      reasons: ['风险中等', '既往慢病史', '主诉持续存在'],
    };
    state.explainableReport.value = {
      conclusion: '建议门诊复查',
      evidence: ['血压持续偏高', '主诉持续 48 小时'],
      basis: ['门诊记录提示既往高血压'],
      actions: ['7 天内复查'],
    };
    state.reasoningItems.value = [
      { kind: 'evidence', text: '收缩压 152mmHg' },
      { kind: 'evidence', text: '舒张压 96mmHg' },
      { kind: 'decision', text: '采用轻度辩论' },
    ];
    state.orchestrationSnapshot.value = createSnapshot();

    expect(state.cockpit.confidenceBadge.value.level).toBe('high');
    expect(state.cockpit.confidenceBadge.value.value).toBeGreaterThan(0.75);

    const evidenceCard = state.cockpit.contributionCards.value.find(
      (card) => card.id === 'evidence',
    );
    const routingCard = state.cockpit.contributionCards.value.find(
      (card) => card.id === 'routing',
    );

    expect(evidenceCard?.score).toBeGreaterThan(60);
    expect(routingCard?.summary).toContain('轻度辩论');
  });

  it('reduces safety score under warning-heavy and escalation scenarios', () => {
    const state = createCockpitState();

    state.routeInfo.value = {
      complexityScore: 8.1,
      routeMode: 'ESCALATE_TO_OFFLINE',
      department: 'multiDisciplinary',
      collaborationMode: 'OFFLINE_ESCALATION',
      reasons: ['红旗症状触发'],
    };
    state.reasoningItems.value = [
      { kind: 'warning', text: '胸痛持续加重' },
      { kind: 'warning', text: '伴随呼吸困难' },
      { kind: 'warning', text: '出现冷汗' },
      { kind: 'evidence', text: '收缩压持续升高' },
    ];

    const safetyCard = state.cockpit.contributionCards.value.find(
      (card) => card.id === 'safety',
    );

    expect(state.cockpit.confidenceBadge.value.level).toBe('low');
    expect(safetyCard?.score).toBeLessThan(30);
    expect(safetyCard?.summary).toContain('风险信号');
  });

  it('toggles simulation scenario and produces projected route insight', () => {
    const state = createCockpitState();

    state.routeInfo.value = {
      complexityScore: 3.1,
      routeMode: 'LIGHT_DEBATE',
      department: 'cardiology',
      collaborationMode: 'SINGLE_SPECIALTY_PANEL',
      reasons: ['中等复杂度'],
    };

    state.cockpit.toggleSimulation('red-flag');
    expect(state.cockpit.selectedSimulationId.value).toBe('red-flag');
    expect(state.cockpit.simulationInsight.value).toContain('线下上转');
    expect(state.cockpit.simulationInsight.value).toContain('复杂度变化');

    state.cockpit.toggleSimulation('red-flag');
    expect(state.cockpit.selectedSimulationId.value).toBeNull();
    expect(state.cockpit.simulationInsight.value).toContain('可点击场景按钮');
  });
});
