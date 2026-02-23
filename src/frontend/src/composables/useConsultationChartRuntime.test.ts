import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConsultationChartRuntime } from './useConsultationChartRuntime';

const { loadEchartsInitMock } = vi.hoisted(() => ({
  loadEchartsInitMock: vi.fn(),
}));

vi.mock('./useEchartsRuntime', () => ({
  loadEchartsInit: loadEchartsInitMock,
}));

interface MockChart {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
}

function createMockChart(): MockChart {
  return {
    on: vi.fn(),
    off: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
  };
}

describe('useConsultationChartRuntime', () => {
  beforeEach(() => {
    loadEchartsInitMock.mockReset();
  });

  it('initializes flow/reasoning charts and triggers ready hooks', async () => {
    const flowElement = document.createElement('div');
    const mapElement = document.createElement('div');
    const flowChart = createMockChart();
    const mapChart = createMockChart();
    const initMock = vi
      .fn()
      .mockImplementation((element: HTMLElement) => {
        return element === flowElement ? flowChart : mapChart;
      });

    loadEchartsInitMock.mockResolvedValue(initMock);

    const flowReady = vi.fn();
    const mapReady = vi.fn();

    const runtime = useConsultationChartRuntime({
      flowChartRef: ref(flowElement),
      reasoningMapRef: ref(mapElement),
    });

    await runtime.initializeCharts({
      onFlowChartReady: flowReady,
      onReasoningMapReady: mapReady,
    });

    expect(loadEchartsInitMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledTimes(2);
    expect(runtime.flowChart.value).not.toBeNull();
    expect(runtime.reasoningMapChart.value).not.toBeNull();
    expect(initMock).toHaveBeenNthCalledWith(1, flowElement);
    expect(initMock).toHaveBeenNthCalledWith(2, mapElement);
    expect(flowReady).toHaveBeenCalledTimes(1);
    expect(mapReady).toHaveBeenCalledTimes(1);
  });

  it('forwards reasoning map click node id to callback', async () => {
    const mapElement = document.createElement('div');
    const flowChart = createMockChart();
    const mapChart = createMockChart();
    const initMock = vi
      .fn()
      .mockImplementation((element: HTMLElement) => {
        return element === mapElement ? mapChart : flowChart;
      });

    loadEchartsInitMock.mockResolvedValue(initMock);
    const onNodeClick = vi.fn();

    const runtime = useConsultationChartRuntime({
      flowChartRef: ref(document.createElement('div')),
      reasoningMapRef: ref(mapElement),
      onReasoningMapNodeClick: onNodeClick,
    });

    await runtime.initializeCharts();

    const clickHandler = mapChart.on.mock.calls.find((call) => call[0] === 'click')?.[1];
    expect(typeof clickHandler).toBe('function');

    clickHandler({ data: { id: 'node-42' } });

    expect(onNodeClick).toHaveBeenCalledWith('node-42');
  });

  it('disposes charts and detaches click listeners', async () => {
    const flowChart = createMockChart();
    const mapChart = createMockChart();
    const initMock = vi
      .fn()
      .mockImplementationOnce(() => flowChart)
      .mockImplementationOnce(() => mapChart);

    loadEchartsInitMock.mockResolvedValue(initMock);

    const runtime = useConsultationChartRuntime({
      flowChartRef: ref(document.createElement('div')),
      reasoningMapRef: ref(document.createElement('div')),
    });

    await runtime.initializeCharts();
    runtime.resizeCharts();
    runtime.disposeCharts();

    expect(flowChart.resize).toHaveBeenCalledTimes(1);
    expect(mapChart.resize).toHaveBeenCalledTimes(1);
    expect(mapChart.off).toHaveBeenCalledWith('click');
    expect(flowChart.dispose).toHaveBeenCalledTimes(1);
    expect(mapChart.dispose).toHaveBeenCalledTimes(1);
    expect(runtime.flowChart.value).toBeNull();
    expect(runtime.reasoningMapChart.value).toBeNull();
  });
});


