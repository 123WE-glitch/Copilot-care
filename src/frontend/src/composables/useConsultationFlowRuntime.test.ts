import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { ECharts } from 'echarts/core';
import type { WorkflowStage } from '@copilot-care/shared/types';
import { useConsultationFlowRuntime } from './useConsultationFlowRuntime';

function createStageRuntime(): Record<
  WorkflowStage,
  { status: 'pending' | 'running' | 'done' | 'failed' | 'skipped' | 'blocked'; message: string }
> {
  return {
    START: { status: 'done', message: 'start' },
    INFO_GATHER: { status: 'done', message: 'info' },
    RISK_ASSESS: { status: 'running', message: 'risk' },
    ROUTING: { status: 'pending', message: 'routing' },
    DEBATE: { status: 'pending', message: 'debate' },
    CONSENSUS: { status: 'pending', message: 'consensus' },
    REVIEW: { status: 'pending', message: 'review' },
    OUTPUT: { status: 'pending', message: 'output' },
    ESCALATION: { status: 'pending', message: 'escalation' },
  };
}

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
  ROUTING: '分流',
  DEBATE: '协同讨论',
  CONSENSUS: '共识',
  REVIEW: '复核',
  OUTPUT: '输出',
  ESCALATION: '升级',
};

describe('useConsultationFlowRuntime', () => {
  it('does nothing when chart is not ready', () => {
    const flowChart = ref<ECharts | null>(null);
    const runtime = useConsultationFlowRuntime({
      flowChart,
      flowStages: FLOW_STAGES,
      stageLabels: STAGE_LABELS,
      stageRuntime: ref(createStageRuntime()),
    });

    expect(() => runtime.renderFlowChart()).not.toThrow();
  });

  it('renders flow chart option when chart exists', () => {
    const setOption = vi.fn();
    const flowChart = ref({
      setOption,
    } as unknown as ECharts);

    const runtime = useConsultationFlowRuntime({
      flowChart,
      flowStages: FLOW_STAGES,
      stageLabels: STAGE_LABELS,
      stageRuntime: ref(createStageRuntime()),
    });

    runtime.renderFlowChart();

    expect(setOption).toHaveBeenCalledTimes(1);
    const args = setOption.mock.calls[0];
    expect(args?.[1]).toBe(true);
    expect(args?.[0]).toHaveProperty('series');
  });
});
