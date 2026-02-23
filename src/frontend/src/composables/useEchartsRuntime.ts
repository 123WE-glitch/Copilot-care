import type { ECharts } from 'echarts/core';

type EChartsInit = (element: HTMLElement) => ECharts;

let cachedInit: EChartsInit | null = null;
let initPromise: Promise<EChartsInit> | null = null;

export async function loadEchartsInit(): Promise<EChartsInit> {
  if (cachedInit) {
    return cachedInit;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const [core, charts, components, renderers] = await Promise.all([
        import('echarts/core'),
        import('echarts/charts'),
        import('echarts/components'),
        import('echarts/renderers'),
      ]);

      core.use([
        charts.GraphChart,
        components.GridComponent,
        components.TooltipComponent,
        renderers.CanvasRenderer,
      ]);

      cachedInit = (element: HTMLElement) => core.init(element);
      return cachedInit;
    })();
  }

  return initPromise;
}
