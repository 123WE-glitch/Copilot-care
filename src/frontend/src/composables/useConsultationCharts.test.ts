import { describe, expect, it } from 'vitest';
import type { OrchestrationSnapshot, WorkflowStage } from '@copilot-care/shared/types';
import {
  buildFlowChartOption,
  buildReasoningMapModel,
  type ConsultationReasoningKind,
  type ConsultationStageRuntimeState,
} from './useConsultationCharts';

type BuildReasoningMapInput = Parameters<typeof buildReasoningMapModel>[0];
type FallbackInput = BuildReasoningMapInput['fallback'];

const FLOW_STAGES: WorkflowStage[] = [
  'START',
  'INFO_GATHER',
  'RISK_ASSESS',
  'ROUTING',
  'DEBATE',
  'CONSENSUS',
  'REVIEW',
  'OUTPUT',
  'ESCALATION',
];

const STAGE_LABELS: Record<WorkflowStage, string> = {
  START: '启动',
  INFO_GATHER: '信息采集',
  RISK_ASSESS: '风险评估',
  ROUTING: '复杂度分流',
  DEBATE: '协同仲裁',
  CONSENSUS: '共识收敛',
  REVIEW: '审校复核',
  OUTPUT: '输出结论',
  ESCALATION: '线下上转',
};

const REASONING_KIND_LABELS: Record<ConsultationReasoningKind, string> = {
  system: '系统',
  evidence: '证据',
  decision: '决策',
  warning: '风险',
  query: '追问',
};

const ROUTE_MODE_LABELS: Record<string, string> = {
  FAST_CONSENSUS: '快速共识',
};

const DEPARTMENT_LABELS: Record<string, string> = {
  cardiology: '心血管专科',
};

const COLLABORATION_LABELS: Record<string, string> = {
  SINGLE_SPECIALTY_PANEL: '同专业多模型协同',
};

function createStageRuntime(): Record<WorkflowStage, ConsultationStageRuntimeState> {
  return {
    START: { status: 'done', message: '已启动' },
    INFO_GATHER: { status: 'done', message: '信息采集完成' },
    RISK_ASSESS: { status: 'done', message: '风险评估完成' },
    ROUTING: { status: 'running', message: '正在分流' },
    DEBATE: { status: 'pending', message: '等待分流完成' },
    CONSENSUS: { status: 'pending', message: '等待辩论结果' },
    REVIEW: { status: 'pending', message: '等待审校' },
    OUTPUT: { status: 'pending', message: '等待输出' },
    ESCALATION: { status: 'blocked', message: '上转流程被阻断' },
  };
}

function createFallbackInput(overrides?: Partial<FallbackInput>): FallbackInput {
  return {
    symptomText: '胸闷、气短 2 小时',
    department: 'cardiology',
    routeMode: 'FAST_CONSENSUS',
    collaboration: 'SINGLE_SPECIALTY_PANEL',
    statusValue: 'OUTPUT',
    statusLabel: '会诊完成',
    conclusionText: '建议门诊复查心电图',
    typedOutput: '建议门诊复查心电图',
    reasoningItems: [
      { kind: 'system', text: '系统开始执行流程' },
      { kind: 'evidence', text: '血压 150/95 mmHg' },
      { kind: 'decision', text: '优先评估心血管风险' },
      { kind: 'query', text: '是否存在放射性疼痛' },
      { kind: 'warning', text: '出现持续胸痛需立即急诊' },
      { kind: 'evidence', text: '血压 150/95 mmHg' },
    ],
    showEvidenceBranches: true,
    reasoningKindLabels: REASONING_KIND_LABELS,
    routeModeLabels: ROUTE_MODE_LABELS,
    departmentLabels: DEPARTMENT_LABELS,
    collaborationLabels: COLLABORATION_LABELS,
    ...overrides,
  };
}

function getFirstGraphSeries(option: Record<string, unknown>): {
  data: Array<Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
  layout: string;
} {
  const chartOption = option as {
    series: Array<{
      data: Array<Record<string, unknown>>;
      links: Array<Record<string, unknown>>;
      layout: string;
    }>;
  };
  return chartOption.series[0];
}

describe('useConsultationCharts', () => {
  it('builds flow chart option for a running stage', () => {
    const option = buildFlowChartOption({
      flowStages: FLOW_STAGES,
      stageLabels: STAGE_LABELS,
      stageRuntime: createStageRuntime(),
    });

    const series = getFirstGraphSeries(option);
    const routingNode = series.data.find((node) => node.id === 'ROUTING');
    const escalationNode = series.data.find((node) => node.id === 'ESCALATION');
    const activeEdge = series.links.find(
      (edge) => edge.source === 'RISK_ASSESS' && edge.target === 'ROUTING',
    );

    expect(series.layout).toBe('none');
    expect(routingNode?.symbolSize).toBe(72);
    expect((routingNode?.itemStyle as { color: string }).color).toBe('#0e8d8f');
    expect((activeEdge?.lineStyle as { color: string; width: number }).color).toBe('#0e8d8f');
    expect((activeEdge?.lineStyle as { color: string; width: number }).width).toBe(4);
    expect((escalationNode?.itemStyle as { color: string }).color).toBe('#c3472a');
  });

  it('prefers snapshot graph model when snapshot nodes exist', () => {
    const snapshot: OrchestrationSnapshot = {
      coordinator: '协调代理',
      phase: 'analysis',
      summary: '快照图生成',
      tasks: [],
      graph: {
        nodes: [
          {
            id: 'input',
            label: '输入需求',
            kind: 'input',
            detail: '胸闷 2 小时',
          },
          {
            id: 'decision',
            label: '风险判定',
            kind: 'decision',
            detail: '优先评估心血管风险',
            color: '#123456',
            emphasis: 1.2,
          },
          {
            id: 'output',
            label: '输出结论',
            kind: 'output',
            detail: '建议线下复诊',
          },
        ],
        edges: [
          { source: 'input', target: 'decision', label: '输入' },
          { source: 'decision', target: 'output', style: 'dashed', weight: 4 },
          { source: 'ghost', target: 'output' },
        ],
      },
      generatedAt: '2026-02-23T00:00:00.000Z',
      source: 'model',
    };

    const model = buildReasoningMapModel({
      snapshot,
      fallback: createFallbackInput(),
    });

    const series = getFirstGraphSeries(model.option);
    const decisionNode = series.data.find((node) => node.id === 'decision');

    expect(series.layout).toBe('force');
    expect(model.details.output.category).toBe('conclusion');
    expect(model.defaultSelectedId).toBe('output');
    expect(series.links).toHaveLength(2);
    expect((decisionNode?.itemStyle as { color: string }).color).toBe('#123456');
  });

  it('builds fallback graph with collapsed evidence branch and escalation status color', () => {
    const model = buildReasoningMapModel({
      snapshot: null,
      fallback: createFallbackInput({
        showEvidenceBranches: false,
        statusValue: 'ESCALATE_TO_OFFLINE',
        statusLabel: '建议线下上转',
        conclusionText: '建议尽快线下急诊评估',
        typedOutput: '  需线下急诊评估  ',
        reasoningItems: [
          { kind: 'system', text: '系统开始执行流程' },
          { kind: 'evidence', text: '收缩压持续升高' },
          { kind: 'evidence', text: '出现胸痛加重' },
          { kind: 'decision', text: '存在急性心血管事件风险' },
          { kind: 'warning', text: '存在持续胸闷' },
          { kind: 'query', text: '是否伴随出汗恶心' },
          { kind: 'evidence', text: '出现胸痛加重' },
        ],
      }),
    });

    const series = getFirstGraphSeries(model.option);
    const statusNode = series.data.find((node) => node.id === 'status');
    const collapsedNode = series.data.find((node) => node.id === 'evidence-collapsed');

    expect(model.defaultSelectedId).toBe('conclusion');
    expect(model.details.conclusion.raw).toBe('需线下急诊评估');
    expect(model.details['evidence-collapsed'].category).toBe('evidence');
    expect(model.details['evidence-collapsed'].summary).toContain('共 4 条关键证据');
    expect(collapsedNode).toBeTruthy();
    expect((statusNode?.itemStyle as { color: string }).color).toBe('#bf8c1f');
  });
});


