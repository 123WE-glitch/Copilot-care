import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ComplexityRoutingTree from './ComplexityRoutingTree.vue';

const { initMock, useMock, setOptionMock, resizeMock, disposeMock } = vi.hoisted(
  () => ({
    initMock: vi.fn(),
    useMock: vi.fn(),
    setOptionMock: vi.fn(),
    resizeMock: vi.fn(),
    disposeMock: vi.fn(),
  }),
);

vi.mock('echarts/core', () => ({
  ECharts: class {},
  init: initMock,
  use: useMock,
}));

vi.mock('echarts/charts', () => ({
  TreeChart: {},
}));

vi.mock('echarts/components', () => ({
  TooltipComponent: {},
  TitleComponent: {},
}));

vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}));

describe('ComplexityRoutingTree', () => {
  beforeEach(() => {
    setOptionMock.mockReset();
    resizeMock.mockReset();
    disposeMock.mockReset();
    initMock.mockReset();
    initMock.mockReturnValue({
      setOption: setOptionMock,
      resize: resizeMock,
      dispose: disposeMock,
    });
  });

  it('renders factor breakdown, corridor and route reasons for routed data', () => {
    const wrapper = mount(ComplexityRoutingTree, {
      props: {
        routing: {
          routeMode: 'DEEP_DEBATE',
          department: 'multiDisciplinary',
          collaborationMode: 'MULTI_DISCIPLINARY_CONSULT',
          complexityScore: 6.6,
          reasons: ['风险进行性上升', '存在多系统症状'],
        },
      },
    });

    expect(wrapper.text()).toContain('复杂度因子拆解');
    expect(wrapper.text()).toContain('阈值走廊与边界距离');
    expect(wrapper.findAll('.factor-card')).toHaveLength(4);
    expect(wrapper.findAll('.corridor-segment.active').length).toBeGreaterThan(0);
    expect(wrapper.findAll('.reasons-section li')).toHaveLength(2);
    expect(setOptionMock).toHaveBeenCalled();
  });

  it('keeps fallback rendering stable when routing data is partial', () => {
    const wrapper = mount(ComplexityRoutingTree, {
      props: {
        routing: {
          department: 'cardiology',
        },
      },
    });

    expect(wrapper.text()).toContain('复杂度尚未完成评分');
    expect(wrapper.text()).toContain('等待复杂度评分完成后显示边界距离');
    expect(wrapper.findAll('.factor-card')).toHaveLength(4);
  });
});
