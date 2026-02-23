<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { OrchestrationTask, OrchestrationGraphNode, OrchestrationGraphEdge } from '@copilot-care/shared/types';

interface ThinkingNode {
  id: string;
  name: string;
  category: number;
  value?: number;
  symbolSize?: number;
  depth?: number;
  status?: 'pending' | 'running' | 'done' | 'blocked';
  agentType?: string;
  provider?: string;
  description?: string;
}

interface ThinkingEdge {
  source: string;
  target: string;
  label?: string;
  lineStyle?: {
    type?: 'solid' | 'dashed' | 'dotted';
    color?: string;
    width?: number;
    curveness?: number;
  };
}

interface ThinkingGraphProps {
  nodes?: OrchestrationGraphNode[];
  edges?: OrchestrationGraphEdge[];
  tasks?: OrchestrationTask[];
  isRunning?: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<ThinkingGraphProps>(), {
  nodes: () => [],
  edges: () => [],
  tasks: () => [],
  isRunning: false,
  compact: false,
});

const emit = defineEmits<{
  (e: 'node-click', nodeId: string): void;
}>();

const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

const CATEGORY_CONFIG = {
  0: { name: '输入', color: '#406c9d', icon: '📥' },
  1: { name: '信息采集', color: '#0e8d8f', icon: '📋' },
  2: { name: '风险评估', color: '#c3472a', icon: '⚠️' },
  3: { name: '复杂度路由', color: '#1f7b80', icon: '🔀' },
  4: { name: 'Agent分析', color: '#6366f1', icon: '🤖' },
  5: { name: '辩论分歧', color: '#f59e0b', icon: '⚡' },
  6: { name: '共识决策', color: '#22c55e', icon: '✅' },
  7: { name: '审校复核', color: '#8b5cf6', icon: '🔍' },
  8: { name: '输出报告', color: '#06b6d4', icon: '📊' },
  9: { name: '总Agent', color: '#2f5878', icon: '🎯' },
};

const AGENT_ICONS: Record<string, string> = {
  cardio: '❤️',
  cardio_01: '❤️',
  cardiovascular: '❤️',
  metabolic: '📊',
  metabolic_01: '📊',
  gp: '🏥',
  gp_01: '🏥',
  safety: '🛡️',
  safety_01: '🛡️',
  specialist: '👨‍⚕️',
};

const PROVIDER_COLORS: Record<string, string> = {
  deepseek: '#3b82f6',
  gemini: '#fbbf24',
  kimi: '#a855f7',
  none: '#6b7280',
};

function getCategoryIndex(kind?: string): number {
  if (!kind) return 4;
  const kindLower = kind.toLowerCase();
  if (kindLower.includes('input')) return 0;
  if (kindLower.includes('info') || kindLower.includes('intake')) return 1;
  if (kindLower.includes('risk')) return 2;
  if (kindLower.includes('routing')) return 3;
  if (kindLower.includes('agent') || kindLower.includes('specialist')) return 4;
  if (kindLower.includes('debate') || kindLower.includes('conflict')) return 5;
  if (kindLower.includes('consensus') || kindLower.includes('synthesis')) return 6;
  if (kindLower.includes('review') || kindLower.includes('audit')) return 7;
  if (kindLower.includes('output')) return 8;
  if (kindLower.includes('coordinator') || kindLower.includes('chief')) return 9;
  return 4;
}

function getNodeStatus(symbol: string): 'pending' | 'running' | 'done' | 'blocked' {
  if (symbol === 'circle') return 'pending';
  if (symbol === 'diamond') return 'running';
  if (symbol === 'rect') return 'done';
  return 'pending';
}

const graphData = computed<ThinkingNode[]>(() => {
  const nodeMap = new Map<string, ThinkingNode>();
  
  if (props.nodes.length > 0) {
    props.nodes.forEach(node => {
      const categoryIdx = getCategoryIndex(node.kind);
      const config = CATEGORY_CONFIG[categoryIdx] || CATEGORY_CONFIG[4];
      
      nodeMap.set(node.id, {
        id: node.id,
        name: node.label,
        category: categoryIdx,
        description: node.detail,
        value: node.emphasis || 0,
        symbolSize: node.emphasis ? 60 + node.emphasis * 20 : 50,
      });
    });
  } else if (props.tasks.length > 0) {
    props.tasks.forEach(task => {
      const categoryIdx = task.roleId.includes('coordinator') ? 9 : 
                          task.roleId.includes('review') ? 7 :
                          task.roleId.includes('output') ? 8 : 4;
      const config = CATEGORY_CONFIG[categoryIdx];
      
      const agentIcon = Object.entries(AGENT_ICONS).find(([key]) => 
        task.roleName.toLowerCase().includes(key)
      )?.[1] || '🤖';
      
      nodeMap.set(task.taskId, {
        id: task.taskId,
        name: `${agentIcon} ${task.roleName}`,
        category: categoryIdx,
        status: task.status as 'pending' | 'running' | 'done' | 'blocked',
        provider: task.provider,
        description: task.objective,
        value: task.progress / 25,
        symbolSize: 40 + task.progress / 2,
      });
    });
    
    const rootTask = props.tasks.find(t => t.roleId.includes('coordinator'));
    if (rootTask && props.tasks.length > 1) {
      props.tasks.forEach(task => {
        if (task.taskId !== rootTask.taskId) {
          if (task.subTasks && task.subTasks.length > 0) {
            task.subTasks.forEach(sub => {
              if (!nodeMap.has(sub.taskId)) {
                nodeMap.set(sub.taskId, {
                  id: sub.taskId,
                  name: `${AGENT_ICONS[sub.roleId] || '🤖'} ${sub.roleName}`,
                  category: 4,
                  status: sub.status as 'pending' | 'running' | 'done' | 'blocked',
                  provider: sub.provider,
                  description: sub.objective,
                  symbolSize: 40,
                });
              }
            });
          }
        }
      });
    }
  }
  
  return Array.from(nodeMap.values());
});

const graphLinks = computed<ThinkingEdge[]>(() => {
  const links: ThinkingEdge[] = [];
  
  if (props.edges.length > 0) {
    props.edges.forEach(edge => {
      links.push({
        source: edge.source,
        target: edge.target,
        label: edge.label,
        lineStyle: {
          type: edge.style === 'dashed' ? 'dashed' : 'solid',
          color: edge.label?.includes('分歧') ? '#f59e0b' : 
                 edge.label?.includes('决策') ? '#22c55e' : '#64748b',
          width: edge.label ? 2 : 1,
          curveness: 0.1,
        },
      });
    });
  } else if (props.tasks.length > 0) {
    const rootTask = props.tasks.find(t => t.roleId.includes('coordinator'));
    if (rootTask) {
      props.tasks.forEach(task => {
        if (task.taskId !== rootTask.taskId) {
          links.push({
            source: rootTask.taskId,
            target: task.taskId,
            lineStyle: {
              type: 'dashed',
              color: '#64748b',
              width: 1,
              curveness: 0.1,
            },
          });
        }
      });
      
      props.tasks.forEach(task => {
        if (task.subTasks && task.subTasks.length > 0) {
          task.subTasks.forEach(sub => {
            links.push({
              source: task.taskId,
              target: sub.taskId,
              label: '分配',
              lineStyle: {
                type: 'dashed',
                color: PROVIDER_COLORS[sub.provider || 'none'],
                width: 2,
                curveness: 0.2,
              },
            });
          });
        }
      });
    }
  }
  
  return links;
});

const chartOption = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    show: true,
    trigger: 'item',
    triggerOn: 'mousemove',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: '#334155',
    textStyle: {
      color: '#e2e8f0',
      fontSize: 12,
    },
    formatter: (params: any) => {
      if (params.dataType === 'node') {
        const node = params.data;
        const config = CATEGORY_CONFIG[node.category] || CATEGORY_CONFIG[4];
        let html = `<div style="padding: 8px;">
          <div style="font-weight: 600; margin-bottom: 6px;">${config.icon} ${node.name}</div>`;
        if (node.description) {
          html += `<div style="color: #94a3b8; font-size: 11px;">${node.description}</div>`;
        }
        if (node.status) {
          const statusColors = { pending: '#6b7280', running: '#3b82f6', done: '#22c55e', blocked: '#ef4444' };
          html += `<div style="margin-top: 6px; color: ${statusColors[node.status]}; font-size: 11px;">
            状态: ${node.status === 'running' ? '进行中' : node.status === 'done' ? '已完成' : node.status === 'blocked' ? '阻塞' : '等待'}
          </div>`;
        }
        if (node.provider) {
          const providerColor = PROVIDER_COLORS[node.provider] || '#6b7280';
          html += `<div style="margin-top: 4px; color: ${providerColor}; font-size: 11px;">
            Provider: ${node.provider}
          </div>`;
        }
        html += `</div>`;
        return html;
      }
      return '';
    },
  },
  series: [
    {
      type: 'graph',
      layout: 'force',
      animation: true,
      animationDuration: 1500,
      animationEasing: 'cubicOut',
      roam: true,
      draggable: true,
      force: {
        repulsion: props.compact ? 200 : 350,
        gravity: 0.1,
        edgeLength: props.compact ? 60 : 100,
        layoutAnimation: true,
      },
      emphasis: {
        focus: 'adjacency',
        scale: 1.1,
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(255, 255, 255, 0.3)',
        },
      },
      lineStyle: {
        curveness: 0.1,
        opacity: 0.8,
      },
      label: {
        show: true,
        position: 'bottom',
        formatter: '{b}',
        fontSize: 10,
        color: '#94a3b8',
        distance: 8,
      },
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2,
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.3)',
      },
      categories: Object.entries(CATEGORY_CONFIG).map(([idx, config]) => ({
        name: config.name,
        itemStyle: {
          color: config.color,
        },
      })),
      data: graphData.value.map(node => ({
        ...node,
        symbol: node.status === 'running' ? 'diamond' : 
                node.status === 'done' ? 'rect' : 
                node.status === 'blocked' ? 'triangle' : 'circle',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
            { offset: 0, color: CATEGORY_CONFIG[node.category]?.color || '#6366f1' },
            { offset: 1, color: CATEGORY_CONFIG[node.category] ? 
              echarts.color.lift(CATEGORY_CONFIG[node.category].color, -0.2) : '#818cf8' },
          ]),
          shadowColor: node.status === 'running' ? '#3b82f6' : 
                      node.status === 'done' ? '#22c55e' : 'rgba(0,0,0,0.2)',
          shadowBlur: node.status === 'running' ? 15 : 8,
        },
      })),
      links: graphLinks.value,
      rightClickToPan: true,
    },
  ],
}));

function initChart() {
  if (!chartRef.value) return;
  
  chartInstance = echarts.init(chartRef.value, undefined, {
    renderer: 'canvas',
  });
  
  chartInstance.setOption(chartOption.value);
  
  chartInstance.on('click', (params) => {
    if (params.dataType === 'node') {
      emit('node-click', params.data.id);
    }
  });
  
  window.addEventListener('resize', handleResize);
}

function handleResize() {
  if (chartInstance) {
    chartInstance.resize();
  }
}

watch([() => props.nodes, () => props.edges, () => props.tasks, () => props.isRunning], () => {
  if (chartInstance) {
    chartInstance.setOption(chartOption.value, true);
  }
}, { deep: true });

onMounted(() => {
  nextTick(() => {
    initChart();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});

defineExpose({
  refresh: () => {
    if (chartInstance) {
      chartInstance.setOption(chartOption.value, true);
    }
  },
});
</script>

<template>
  <div class="thinking-graph-container">
    <div class="graph-header">
      <div class="header-left">
        <span 
          class="thinking-indicator" 
          :class="{ active: isRunning }"
        ></span>
        <h3>🧠 多Agent思维导图</h3>
      </div>
      <div class="header-stats">
        <span class="stat-badge">{{ graphData.length }} 节点</span>
        <span class="stat-badge">{{ graphLinks.length }} 边</span>
      </div>
    </div>
    
    <div 
      ref="chartRef" 
      class="graph-chart"
      :class="{ 'compact-mode': compact }"
    ></div>
    
    <div v-if="graphData.length === 0" class="empty-state">
      <span class="empty-icon">🧠</span>
      <p>等待Agent思维过程...</p>
      <p class="hint">提交会诊请求后将自动生成思维导图</p>
    </div>
  </div>
</template>

<style scoped>
.thinking-graph-container {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-radius: 16px;
  border: 1px solid rgba(100, 200, 255, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(100, 200, 255, 0.1);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.thinking-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4b5563;
  transition: all 0.3s ease;
}

.thinking-indicator.active {
  background: #22c55e;
  box-shadow: 0 0 10px #22c55e;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.3); }
}

.graph-header h3 {
  margin: 0;
  font-size: 14px;
  color: #e2e8f0;
  font-weight: 600;
}

.header-stats {
  display: flex;
  gap: 8px;
}

.stat-badge {
  font-size: 11px;
  padding: 4px 10px;
  background: rgba(100, 200, 255, 0.1);
  border-radius: 12px;
  color: #94a3b8;
}

.graph-chart {
  flex: 1;
  min-height: 350px;
}

.graph-chart.compact-mode {
  min-height: 250px;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #64748b;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.empty-state .hint {
  margin-top: 8px;
  font-size: 12px;
  color: #475569;
}
</style>
