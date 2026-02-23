import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { ECharts } from 'echarts/core';
import { useConsultationReasoningMap } from './useConsultationReasoningMap';

function createReasoningMapState(setOption = vi.fn()) {
  const chart = ref({
    setOption,
  } as unknown as ECharts);

  const state = useConsultationReasoningMap({
    reasoningMapChart: chart,
    formSymptomText: ref('头晕，乏力'),
    routeInfo: ref(null),
    routingPreview: ref({
      routeMode: 'LIGHT_DEBATE',
      department: 'cardiology',
      collaborationMode: 'SINGLE_SPECIALTY_PANEL',
    }),
    status: ref('IDLE'),
    statusLabels: {
      IDLE: '待会诊',
      OUTPUT: '会诊完成',
      ESCALATE_TO_OFFLINE: '建议线下上转',
      ABSTAIN: '暂缓结论',
      ERROR: '会诊异常',
    },
    explainableReport: ref(null),
    typedOutput: ref(''),
    orchestrationSnapshot: ref(null),
    reasoningItems: ref([
      { kind: 'evidence', text: '近期收缩压升高' },
      { kind: 'decision', text: '建议门诊复查' },
    ]),
    reasoningKindLabels: {
      system: '系统',
      evidence: '证据',
      decision: '决策',
      warning: '风险',
      query: '补充',
    },
    routeModeLabels: {
      LIGHT_DEBATE: '轻度辩论',
    },
    departmentLabels: {
      cardiology: '心血管专科',
    },
    collaborationLabels: {
      SINGLE_SPECIALTY_PANEL: '同专业多模型协同',
    },
  });

  return { state, setOption };
}

describe('useConsultationReasoningMap', () => {
  it('renders reasoning map and selects default node', () => {
    const { state, setOption } = createReasoningMapState();

    state.renderReasoningMap();

    expect(setOption).toHaveBeenCalledTimes(1);
    expect(state.selectedReasoningNode.value?.id).toBe('conclusion');
    expect(state.selectedReasoningNode.value?.summary).toContain('等待结论输出');
  });

  it('toggles evidence branches and rerenders chart', () => {
    const { state, setOption } = createReasoningMapState();
    state.renderReasoningMap();
    expect(state.showEvidenceBranches.value).toBe(true);

    state.toggleEvidenceBranches();

    expect(state.showEvidenceBranches.value).toBe(false);
    expect(setOption).toHaveBeenCalledTimes(2);
  });

  it('updates selected node on click and ignores unknown node id', () => {
    const { state } = createReasoningMapState();
    state.renderReasoningMap();

    state.handleReasoningMapNodeClick('route');
    expect(state.selectedReasoningNode.value?.id).toBe('route');

    state.handleReasoningMapNodeClick('unknown');
    expect(state.selectedReasoningNode.value?.id).toBe('route');
  });

  it('resets map selection state', () => {
    const { state } = createReasoningMapState();
    state.renderReasoningMap();
    expect(state.selectedReasoningNode.value).not.toBeNull();

    state.resetReasoningMapSelection();

    expect(state.selectedReasoningNode.value).toBeNull();
  });

  it('is safe when chart is not ready', () => {
    const state = useConsultationReasoningMap({
      reasoningMapChart: ref(null),
      formSymptomText: ref('test'),
      routeInfo: ref(null),
      routingPreview: ref({}),
      status: ref('IDLE'),
      statusLabels: { IDLE: '待会诊' },
      explainableReport: ref(null),
      typedOutput: ref(''),
      orchestrationSnapshot: ref(null),
      reasoningItems: ref([]),
      reasoningKindLabels: {
        system: '系统',
        evidence: '证据',
        decision: '决策',
        warning: '风险',
        query: '补充',
      },
      routeModeLabels: {},
      departmentLabels: {},
      collaborationLabels: {},
    });

    expect(() => state.renderReasoningMap()).not.toThrow();
    expect(() => state.toggleEvidenceBranches()).not.toThrow();
  });
});
