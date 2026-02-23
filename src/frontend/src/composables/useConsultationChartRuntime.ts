import { ref, type Ref } from 'vue';
import type { ECharts } from 'echarts/core';
import { loadEchartsInit } from './useEchartsRuntime';

export interface ConsultationChartInitHooks {
  onFlowChartReady?: () => void;
  onReasoningMapReady?: () => void;
}

interface UseConsultationChartRuntimeOptions {
  flowChartRef?: Ref<HTMLElement | null>;
  reasoningMapRef: Ref<HTMLElement | null>;
  onReasoningMapNodeClick?: (nodeId: string) => void;
}

export function useConsultationChartRuntime(
  options: UseConsultationChartRuntimeOptions,
) {
  const flowChart = ref<ECharts | null>(null);
  const reasoningMapChart = ref<ECharts | null>(null);

  function bindReasoningMapInteraction(): void {
    const chart = reasoningMapChart.value;
    if (!chart) {
      return;
    }

    chart.off('click');
    chart.on('click', (params: unknown) => {
      const maybe = params as { data?: { id?: unknown } };
      const nodeId = maybe.data?.id;
      if (typeof nodeId !== 'string') {
        return;
      }
      options.onReasoningMapNodeClick?.(nodeId);
    });
  }

  async function initializeCharts(hooks: ConsultationChartInitHooks = {}): Promise<void> {
    const initChart = await loadEchartsInit();

    if (options.flowChartRef?.value && !flowChart.value) {
      flowChart.value = initChart(options.flowChartRef.value);
      hooks.onFlowChartReady?.();
    }

    if (options.reasoningMapRef.value && !reasoningMapChart.value) {
      reasoningMapChart.value = initChart(options.reasoningMapRef.value);
      bindReasoningMapInteraction();
      hooks.onReasoningMapReady?.();
    }
  }

  function resizeCharts(): void {
    flowChart.value?.resize();
    reasoningMapChart.value?.resize();
  }

  function disposeCharts(): void {
    if (flowChart.value) {
      flowChart.value.dispose();
      flowChart.value = null;
    }
    if (reasoningMapChart.value) {
      reasoningMapChart.value.off('click');
      reasoningMapChart.value.dispose();
      reasoningMapChart.value = null;
    }
  }

  return {
    flowChart,
    reasoningMapChart,
    initializeCharts,
    resizeCharts,
    disposeCharts,
  };
}
