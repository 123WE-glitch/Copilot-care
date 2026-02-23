import type { Ref } from 'vue';
import type { WorkflowStage } from '@copilot-care/shared/types';
import {
  buildFlowChartOption,
  type ConsultationStageRuntimeState,
} from './useConsultationCharts';

interface ChartLike {
  setOption: (option: unknown, notMerge?: boolean) => void;
}

interface UseConsultationFlowRuntimeOptions {
  flowChart: Ref<ChartLike | null>;
  flowStages: WorkflowStage[];
  stageLabels: Record<WorkflowStage, string>;
  stageRuntime: Ref<Record<WorkflowStage, ConsultationStageRuntimeState>>;
}

interface UseConsultationFlowRuntimeState {
  renderFlowChart: () => void;
}

export function useConsultationFlowRuntime(
  options: UseConsultationFlowRuntimeOptions,
): UseConsultationFlowRuntimeState {
  function renderFlowChart(): void {
    const chart = options.flowChart.value;
    if (!chart) {
      return;
    }

    chart.setOption(
      buildFlowChartOption({
        flowStages: options.flowStages,
        stageLabels: options.stageLabels,
        stageRuntime: options.stageRuntime.value,
      }),
      true,
    );
  }

  return {
    renderFlowChart,
  };
}
