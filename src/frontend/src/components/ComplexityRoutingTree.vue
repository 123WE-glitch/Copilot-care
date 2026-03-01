<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { TreeChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ECharts, init, use } from 'echarts/core';
import { resolveCopilotChartTheme } from '../features/chart/theme';
import {
  COLLABORATION_LABELS,
  DEPARTMENT_LABELS,
  ROUTE_MODE_LABELS,
} from '../constants/triageLabels';
import { useComplexityRoutingBreakdown } from '../composables/useComplexityRoutingBreakdown';
import type {
  ChartDensity,
  VisualizationState,
} from '../types/visualization';

use([TreeChart, TooltipComponent, TitleComponent, CanvasRenderer]);

interface RoutingInfo {
  routeMode?: string;
  department?: string;
  collaborationMode?: string;
  complexityScore?: number;
  reasons?: string[];
}

interface Props {
  routing?: RoutingInfo;
  hasRedFlag?: boolean;
  currentStage?: string;
  state?: VisualizationState;
  density?: ChartDensity;
}

interface TreeNode {
  name: string;
  value: string;
  itemStyle: {
    color: string;
    borderColor: string;
    borderWidth: number;
  };
  label: {
    fontSize: number;
    fontWeight?: 'normal' | 'bold';
  };
  children: TreeNode[];
}

const props = withDefaults(defineProps<Props>(), {
  routing: () => ({}),
  hasRedFlag: false,
  currentStage: '',
  state: 'idle',
  density: 'comfortable',
});

const chartRef = ref<HTMLElement | null>(null);
const themeRevision = ref(0);
let chart: ECharts | null = null;
let themeObserver: MutationObserver | null = null;

function getChartTheme() {
  themeRevision.value;
  return resolveCopilotChartTheme();
}

function getRouteModeColor(mode: string | undefined): string {
  const chartTheme = getChartTheme();
  switch (mode) {
    case 'FAST_CONSENSUS':
      return chartTheme.flow.done;
    case 'LIGHT_DEBATE':
      return chartTheme.flow.skipped;
    case 'DEEP_DEBATE':
      return chartTheme.graphNode.decision;
    case 'ESCALATE_TO_OFFLINE':
      return chartTheme.flow.blocked;
    default:
      return chartTheme.flow.pending;
  }
}

function getDepartmentIcon(dept: string): string {
  switch (dept) {
    case 'cardiology':
      return '心';
    case 'metabolic':
      return '代';
    case 'generalPractice':
      return '全';
    case 'multiDisciplinary':
      return '多';
    default:
      return '科';
  }
}

function formatComplexityScore(score: number | undefined): string {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return '--';
  }
  return score.toFixed(1);
}

const complexityLevel = computed(() => {
  const score = props.routing?.complexityScore;
  if (score === undefined) return 'unknown';
  if (score <= 2) return 'low';
  if (score <= 5) return 'medium';
  return 'high';
});

const treeData = computed(() => {
  const routing = props.routing;
  const hasResult = routing?.routeMode !== undefined;
  const chartTheme = getChartTheme();

  const root: TreeNode = {
    name: '分诊入口',
    value: 'start',
    itemStyle: {
      color: chartTheme.graphNode.input,
      borderColor: chartTheme.border,
      borderWidth: 2,
    },
    label: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    children: [],
  };

  const redFlagNode: TreeNode = {
    name: '红旗检查',
    value: 'redflag',
    itemStyle: {
      color: props.hasRedFlag ? chartTheme.flow.blocked : chartTheme.flow.done,
      borderColor: chartTheme.border,
      borderWidth: 2,
    },
    label: {
      fontSize: 11,
    },
    children: props.hasRedFlag
      ? [
          {
            name: '线下上转',
            value: 'escalation',
            itemStyle: {
              color: chartTheme.flow.blocked,
              borderColor: chartTheme.border,
              borderWidth: 2,
            },
            label: {
              fontSize: 11,
              fontWeight: 'bold',
            },
            children: [],
          },
        ]
      : [],
  };

  root.children.push(redFlagNode);

  if (!props.hasRedFlag) {
    const complexityNode: TreeNode = {
      name: `复杂度评估\n评分: ${formatComplexityScore(routing?.complexityScore)}`,
      value: 'complexity',
      itemStyle: {
        color:
          complexityLevel.value === 'low'
            ? chartTheme.flow.done
            : complexityLevel.value === 'medium'
              ? chartTheme.flow.skipped
              : complexityLevel.value === 'high'
                ? chartTheme.graphNode.decision
                : chartTheme.flow.pending,
        borderColor: chartTheme.border,
        borderWidth: 2,
      },
      label: {
        fontSize: 11,
        fontWeight: 'normal',
      },
      children: [],
    };

    redFlagNode.children.push(complexityNode);

    if (hasResult) {
      const routeMode = routing.routeMode as string;
      const routeNode: TreeNode = {
        name: ROUTE_MODE_LABELS[routeMode] ?? routeMode,
        value: routeMode,
        itemStyle: {
          color: getRouteModeColor(routeMode),
          borderColor: chartTheme.border,
          borderWidth: 2,
        },
        label: {
          fontSize: 11,
          fontWeight: 'bold',
        },
        children: [],
      };

      complexityNode.children.push(routeNode);

      if (routing.department) {
        const deptNode: TreeNode = {
          name: `${getDepartmentIcon(routing.department)} ${DEPARTMENT_LABELS[routing.department] ?? routing.department}`,
          value: routing.department,
          itemStyle: {
            color: chartTheme.graphNode.input,
            borderColor: chartTheme.border,
            borderWidth: 2,
          },
          label: {
            fontSize: 11,
            fontWeight: 'normal',
          },
          children: [],
        };

        routeNode.children.push(deptNode);

        if (routing.collaborationMode) {
          deptNode.children.push({
            name:
              COLLABORATION_LABELS[routing.collaborationMode]
              ?? routing.collaborationMode,
            value: routing.collaborationMode,
            itemStyle: {
              color: chartTheme.graphNode.stage,
              borderColor: chartTheme.border,
              borderWidth: 2,
            },
            label: {
              fontSize: 10,
              fontWeight: 'normal',
            },
            children: [],
          });
        }
      }
    }
  }

  return root;
});

const {
  complexityScore,
  factorBreakdown,
  thresholdCorridor,
  corridorPointerPercent,
  boundaryDistanceText,
  routeAlignmentText,
  expectedRouteLabel,
  topReasons,
} = useComplexityRoutingBreakdown({
  routing: computed(() => props.routing),
  hasRedFlag: computed(() => props.hasRedFlag),
  routeModeLabels: ROUTE_MODE_LABELS,
});

const chartOption = computed(() => {
  const dense = props.density === 'compact';
  const chartTheme = getChartTheme();
  return {
  tooltip: {
    trigger: 'item',
    triggerOn: 'mousemove',
    backgroundColor: chartTheme.tooltipBackground,
    borderColor: chartTheme.tooltipBorder,
    textStyle: {
      color: chartTheme.tooltipText,
    },
    formatter: (params: { name: string; value: string }) => {
      return `<strong>${params.name.replace('\n', '<br/>')}</strong><br/>节点: ${params.value}`;
    },
  },
  series: [
    {
      type: 'tree',
      data: [treeData.value],
      left: '4%',
      right: '12%',
      top: '7%',
      bottom: '7%',
      symbol: 'rect',
      symbolSize: dense ? [86, 34] : [96, 38],
      orient: 'LR',
      expandAndCollapse: false,
      initialTreeDepth: -1,
      label: {
        position: 'inside',
        verticalAlign: 'middle',
        align: 'center',
        fontSize: 11,
        color: chartTheme.textInverse,
      },
      leaves: {
        label: {
          position: 'inside',
          verticalAlign: 'middle',
          align: 'center',
        },
      },
      lineStyle: {
        width: 2,
        curveness: 0.45,
        color: chartTheme.flow.linkDefault,
      },
      emphasis: {
        focus: 'descendant',
        itemStyle: {
          shadowBlur: 10,
          shadowColor: chartTheme.flow.linkDefault,
        },
      },
    },
  ],
};
});

function initChart(): void {
  if (!chartRef.value) return;
  chart = init(chartRef.value);
  chart.setOption(chartOption.value);
}

function updateChart(): void {
  if (chart) {
    chart.setOption(chartOption.value, { notMerge: true });
  }
}

function resizeChart(): void {
  chart?.resize();
}

watch(
  [
    () => props.routing,
    () => props.hasRedFlag,
    () => props.density,
    () => themeRevision.value,
  ],
  updateChart,
  { deep: true },
);

onMounted(() => {
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver((mutations) => {
      const hasThemeMutation = mutations.some(
        (mutation) => mutation.type === 'attributes'
          && mutation.attributeName === 'data-theme',
      );
      if (!hasThemeMutation) {
        return;
      }
      themeRevision.value += 1;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }
  initChart();
  window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  themeObserver = null;
  chart?.dispose();
  chart = null;
  window.removeEventListener('resize', resizeChart);
});
</script>

<template>
  <div
    class="routing-tree-container"
    :class="[`state-${state}`, `density-${density}`]"
  >
    <div class="header">
      <h3>复杂度路由决策树</h3>
      <div class="routing-summary">
        <span class="score-badge">
          复杂度: {{ formatComplexityScore(complexityScore) }}
        </span>
        <span
          v-if="routing?.routeMode"
          class="route-badge"
          :style="{ background: getRouteModeColor(routing.routeMode) }"
        >
          {{ ROUTE_MODE_LABELS[routing.routeMode] ?? routing.routeMode }}
        </span>
        <span class="expected-badge">阈值建议: {{ expectedRouteLabel }}</span>
      </div>
    </div>

    <div ref="chartRef" class="tree-chart"></div>

    <section class="factor-section">
      <h4>复杂度因子拆解</h4>
      <div class="factor-grid">
        <article v-for="factor in factorBreakdown" :key="factor.id" class="factor-card">
          <div class="factor-head">
            <strong>{{ factor.label }}</strong>
            <span>{{ factor.score.toFixed(1) }}</span>
          </div>
          <div class="factor-track">
            <div class="factor-fill" :style="{ width: `${factor.weightPercent}%` }" />
          </div>
          <p>{{ factor.detail }}</p>
        </article>
      </div>
    </section>

    <section class="corridor-section">
      <h4>阈值走廊与边界距离</h4>
      <div class="corridor-track">
        <div
          v-for="item in thresholdCorridor"
          :key="item.mode"
          class="corridor-segment"
          :class="{ active: item.active }"
          :style="{ width: `${item.widthPercent}%` }"
        >
          <small>{{ item.label }}</small>
          <strong>{{ item.min }}-{{ item.max }}</strong>
        </div>
        <div
          v-if="corridorPointerPercent !== null"
          class="corridor-pointer"
          :style="{ left: `${corridorPointerPercent}%` }"
        />
      </div>
      <p class="corridor-note">{{ routeAlignmentText }}</p>
      <p class="corridor-note boundary">{{ boundaryDistanceText }}</p>
    </section>

    <section v-if="topReasons.length > 0" class="reasons-section">
      <h4>当前路由依据</h4>
      <ul>
        <li v-for="reason in topReasons" :key="reason">{{ reason }}</li>
      </ul>
    </section>

    <div class="routing-rules">
      <h4>路由规则</h4>
      <ul>
        <li>红旗症状优先触发安全边界，必要时直接线下上转。</li>
        <li>复杂度分数决定协同深度，阈值区间决定默认路由。</li>
        <li>路由与阈值不一致时，需复核边界并记录原因。</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.routing-tree-container {
  --rt-surface: var(--color-surface-elevated);
  --rt-surface-soft: var(--color-surface-soft);
  --rt-border: var(--color-border);
  --rt-border-soft: var(--color-border-light);
  --rt-text-strong: var(--color-text-primary);
  --rt-text-body: var(--color-text-secondary);
  --rt-text-muted: var(--color-text-muted);
  --rt-glow-cool: color-mix(in srgb, var(--color-info) 24%, transparent);
  --rt-glow-warm: color-mix(in srgb, var(--color-warning) 26%, transparent);
  background:
    radial-gradient(circle at 6% 8%, var(--rt-glow-cool), transparent 52%),
    radial-gradient(circle at 92% 92%, var(--rt-glow-warm), transparent 45%),
    var(--rt-surface);
  border-radius: 10px;
  padding: 16px;
  border: 1px solid var(--rt-border);
  position: relative;
  overflow: hidden;
}

.routing-tree-container.state-running {
  border-color: var(--color-risk-warning-border);
}

.routing-tree-container.state-done {
  border-color: var(--color-risk-normal-border);
}

.routing-tree-container.state-blocked {
  border-color: var(--color-risk-critical-border);
}

.routing-tree-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--color-info),
    var(--cc-accent-violet-500),
    var(--color-success)
  );
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.header h3 {
  margin: 0;
  font-size: 15px;
  color: var(--rt-text-strong);
}

.routing-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.score-badge,
.route-badge,
.expected-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.score-badge {
  background: color-mix(in srgb, var(--rt-surface-soft) 92%, transparent);
  color: var(--rt-text-body);
  border: 1px solid var(--rt-border-soft);
}

.route-badge {
  color: var(--cc-text-inverse);
}

.expected-badge {
  background: var(--color-risk-warning-bg);
  color: var(--color-risk-warning-fg);
  border: 1px solid var(--color-risk-warning-border);
}

.tree-chart {
  width: 100%;
  height: 300px;
  margin-top: 8px;
}

.factor-section,
.corridor-section,
.reasons-section {
  margin-top: 12px;
  border-top: 1px solid var(--rt-border-soft);
  padding-top: 12px;
}

.factor-section h4,
.corridor-section h4,
.reasons-section h4,
.routing-rules h4 {
  margin: 0;
  font-size: 12px;
  color: var(--rt-text-muted);
}

.factor-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.routing-tree-container.density-compact .tree-chart {
  height: 260px;
}

.routing-tree-container.density-compact .factor-grid {
  grid-template-columns: 1fr;
}

.factor-card {
  border: 1px solid var(--rt-border-soft);
  border-radius: 8px;
  background: color-mix(in srgb, var(--rt-surface) 92%, transparent);
  padding: 8px;
}

.factor-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--rt-text-body);
}

.factor-head span {
  font-weight: 700;
  color: var(--color-primary);
}

.factor-track {
  margin-top: 6px;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--rt-border-soft);
  overflow: hidden;
}

.factor-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--color-primary) 0%,
    var(--color-info) 100%
  );
}

.factor-card p {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--rt-text-body);
  line-height: 1.4;
}

.corridor-track {
  margin-top: 8px;
  position: relative;
  display: flex;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--rt-border);
}

.corridor-segment {
  padding: 8px 4px;
  background: color-mix(in srgb, var(--rt-surface-soft) 88%, transparent);
  border-right: 1px solid var(--rt-border-soft);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.corridor-segment:last-child {
  border-right: none;
}

.corridor-segment.active {
  background: color-mix(in srgb, var(--color-primary) 14%, var(--rt-surface));
}

.corridor-segment small {
  font-size: 10px;
  color: var(--rt-text-muted);
}

.corridor-segment strong {
  font-size: 11px;
  color: var(--rt-text-strong);
}

.corridor-pointer {
  position: absolute;
  top: -4px;
  width: 0;
  height: calc(100% + 8px);
  border-left: 2px solid var(--color-danger);
  transform: translateX(-1px);
}

.corridor-pointer::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -5px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--color-danger);
}

.corridor-note {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--rt-text-body);
}

.corridor-note.boundary {
  color: var(--color-primary);
}

.reasons-section ul,
.routing-rules ul {
  margin: 8px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

.reasons-section li,
.routing-rules li {
  font-size: 12px;
  color: var(--rt-text-body);
  line-height: 1.45;
}

.routing-rules {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--rt-border-soft);
}

@media (max-width: 900px) {
  .header {
    flex-direction: column;
  }

  .routing-summary {
    justify-content: flex-start;
  }

  .factor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
