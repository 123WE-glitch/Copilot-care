<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { DebateRound, DissentComputation } from '@copilot-care/shared/types';

interface AgentNode {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  color: string;
  icon: string;
  pulsePhase: number;
  isThinking: boolean;
  opinion?: string;
}

interface Connection {
  source: string;
  target: string;
  particles: Particle[];
  intensity: number;
}

interface Particle {
  id: number;
  progress: number;
  speed: number;
  size: number;
}

interface Props {
  rounds?: DebateRound[];
  currentRound?: number;
  isRunning?: boolean;
  hasRedFlag?: boolean;
  finalConsensus?: string;
}

const props = withDefaults(defineProps<Props>(), {
  rounds: () => [],
  currentRound: 0,
  isRunning: false,
  hasRedFlag: false,
  finalConsensus: undefined,
});

// 4个Agent节点的布局（中心对称）
const agents = ref<AgentNode[]>([
  {
    id: 'cardio',
    name: '心血管专家',
    role: 'Cardiology',
    x: 50,
    y: 15,
    color: '#ff6b6b',
    icon: '❤️',
    pulsePhase: 0,
    isThinking: false,
  },
  {
    id: 'gp',
    name: '全科医师',
    role: 'GP',
    x: 85,
    y: 50,
    color: '#4ecdc4',
    icon: '🏥',
    pulsePhase: 0,
    isThinking: false,
  },
  {
    id: 'metabolic',
    name: '代谢专家',
    role: 'Metabolic',
    x: 50,
    y: 85,
    color: '#ffe66d',
    icon: '📊',
    pulsePhase: 0,
    isThinking: false,
  },
  {
    id: 'safety',
    name: '安全审查',
    role: 'Safety',
    x: 15,
    y: 50,
    color: '#a8e6cf',
    icon: '🛡️',
    pulsePhase: 0,
    isThinking: false,
  },
]);

// 中央协调器
const coordinator = ref({
  x: 50,
  y: 50,
  pulsePhase: 0,
  isActive: false,
});

// 节点间连接
const connections = ref<Connection[]>([
  { source: 'cardio', target: 'coordinator', particles: [], intensity: 0.5 },
  { source: 'gp', target: 'coordinator', particles: [], intensity: 0.5 },
  { source: 'metabolic', target: 'coordinator', particles: [], intensity: 0.5 },
  { source: 'safety', target: 'coordinator', particles: [], intensity: 0.5 },
  { source: 'cardio', target: 'gp', particles: [], intensity: 0.3 },
  { source: 'gp', target: 'metabolic', particles: [], intensity: 0.3 },
  { source: 'metabolic', target: 'safety', particles: [], intensity: 0.3 },
  { source: 'safety', target: 'cardio', particles: [], intensity: 0.3 },
]);

// 动画循环
let animationId: number | null = null;
let particleIdCounter = 0;

// 计算DI（分歧指数）对应的颜色强度
const diIntensity = computed(() => {
  if (props.rounds.length === 0 || props.currentRound === 0) return 0;
  const currentRound = props.rounds[props.currentRound - 1];
  if (!currentRound) return 0;
  return Math.min(currentRound.dissentIndex || 0, 1);
});

// 生成粒子
function spawnParticle(connection: Connection) {
  if (connection.particles.length < 3 + diIntensity.value * 5) {
    connection.particles.push({
      id: particleIdCounter++,
      progress: 0,
      speed: 0.005 + Math.random() * 0.005,
      size: 2 + Math.random() * 2,
    });
  }
}

// 更新动画
function updateAnimation() {
  // 更新Agent脉冲
  agents.value.forEach((agent) => {
    agent.pulsePhase = (agent.pulsePhase + 0.05) % (Math.PI * 2);
  });
  
  // 更新协调器脉冲
  coordinator.value.pulsePhase = (coordinator.value.pulsePhase + 0.03) % (Math.PI * 2);
  
  // 更新粒子
  connections.value.forEach((conn) => {
    // 随机生成新粒子
    if (Math.random() < 0.1 * conn.intensity) {
      spawnParticle(conn);
    }
    
    // 更新现有粒子位置
    conn.particles = conn.particles.filter((p) => {
      p.progress += p.speed * (1 + diIntensity.value);
      return p.progress < 1;
    });
  });
  
  // 根据DI调整连接强度
  connections.value.forEach((conn) => {
    if (conn.target === 'coordinator') {
      conn.intensity = 0.5 + diIntensity.value * 0.5;
    }
  });
  
  animationId = requestAnimationFrame(updateAnimation);
}

// 监听运行状态
watch(() => props.isRunning, (running) => {
  if (running) {
    coordinator.value.isActive = true;
    agents.value.forEach((agent) => {
      agent.isThinking = true;
    });
  } else {
    coordinator.value.isActive = false;
    agents.value.forEach((agent) => {
      agent.isThinking = false;
    });
  }
});

// 监听轮次变化
watch(() => props.currentRound, (round) => {
  if (round > 0 && props.rounds[round - 1]) {
    const currentRound = props.rounds[round - 1];
    // 更新Agent意见
    currentRound.opinions.forEach((opinion) => {
      const agent = agents.value.find((a) => 
        a.role.toLowerCase() === opinion.role.toLowerCase() ||
        (opinion.role === 'Specialist' && a.id === 'cardio')
      );
      if (agent) {
        agent.opinion = `${opinion.riskLevel}: ${opinion.reasoning.slice(0, 30)}...`;
      }
    });
  }
});

onMounted(() => {
  animationId = requestAnimationFrame(updateAnimation);
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});

// 计算节点位置样式
function getNodeStyle(node: AgentNode) {
  const pulseScale = 1 + Math.sin(node.pulsePhase) * 0.05;
  const glowIntensity = node.isThinking ? 0.8 : 0.3;
  const redFlagGlow = props.hasRedFlag ? '0 0 30px rgba(255, 0, 0, 0.6)' : 'none';
  
  return {
    left: `${node.x}%`,
    top: `${node.y}%`,
    transform: `translate(-50%, -50%) scale(${pulseScale})`,
    boxShadow: `
      0 0 ${20 * glowIntensity}px ${node.color},
      0 0 ${40 * glowIntensity}px ${node.color}40,
      ${redFlagGlow}
    `,
    borderColor: props.hasRedFlag ? '#ff0000' : node.color,
  };
}

// 计算协调器样式
function getCoordinatorStyle() {
  const pulseScale = 1 + Math.sin(coordinator.value.pulsePhase) * 0.08;
  const activeGlow = coordinator.value.isActive ? '0 0 50px rgba(100, 200, 255, 0.8)' : 'none';
  
  return {
    left: `${coordinator.value.x}%`,
    top: `${coordinator.value.y}%`,
    transform: `translate(-50%, -50%) scale(${pulseScale})`,
    boxShadow: `
      0 0 30px rgba(100, 200, 255, 0.6),
      0 0 60px rgba(100, 200, 255, 0.3),
      ${activeGlow}
    `,
  };
}

// 获取连接路径
function getConnectionPath(conn: Connection) {
  const sourceNode = conn.source === 'coordinator' 
    ? coordinator.value 
    : agents.value.find((a) => a.id === conn.source);
  const targetNode = conn.target === 'coordinator'
    ? coordinator.value
    : agents.value.find((a) => a.id === conn.target);
    
  if (!sourceNode || !targetNode) return '';
  
  return `M ${sourceNode.x} ${sourceNode.y} L ${targetNode.x} ${targetNode.y}`;
}

// 获取粒子位置
function getParticleStyle(conn: Connection, particle: Particle) {
  const sourceNode = conn.source === 'coordinator'
    ? coordinator.value
    : agents.value.find((a) => a.id === conn.source);
  const targetNode = conn.target === 'coordinator'
    ? coordinator.value
    : agents.value.find((a) => a.id === conn.target);
    
  if (!sourceNode || !targetNode) return {};
  
  const x = sourceNode.x + (targetNode.x - sourceNode.x) * particle.progress;
  const y = sourceNode.y + (targetNode.y - sourceNode.y) * particle.progress;
  
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${particle.size}px`,
    height: `${particle.size}px`,
    opacity: 1 - Math.abs(particle.progress - 0.5) * 2,
  };
}
</script>

<template>
  <div class="neural-network-container">
    <!-- 背景网格 -->
    <div class="grid-background"></div>
    
    <!-- 标题 -->
    <div class="network-header">
      <h3 class="title">
        <span class="pulse-dot"></span>
        医疗大脑 · 多Agent协同神经网络
      </h3>
      <div class="status-bar">
        <span class="status-item" :class="{ active: isRunning }">
          {{ isRunning ? '协同诊断中' : '等待启动' }}
        </span>
        <span v-if="hasRedFlag" class="status-item red-flag">
          🚨 红旗警告
        </span>
        <span v-if="currentRound > 0" class="status-item">
          第 {{ currentRound }} 轮讨论
        </span>
        <span v-if="diIntensity > 0" class="status-item dissent">
          DI: {{ (diIntensity * 100).toFixed(0) }}%
        </span>
      </div>
    </div>
    
    <!-- 网络图区域 -->
    <div class="network-canvas">
      <svg class="connections-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
        <!-- 连接线 -->
        <g v-for="(conn, index) in connections" :key="index">
          <path
            :d="getConnectionPath(conn)"
            class="connection-line"
            :style="{ 
              strokeOpacity: conn.intensity * 0.6,
              strokeWidth: 0.3 + conn.intensity * 0.4
            }"
          />
        </g>
      </svg>
      
      <!-- 粒子层 -->
      <div class="particles-layer">
        <template v-for="(conn, connIndex) in connections" :key="connIndex">
          <div
            v-for="particle in conn.particles"
            :key="particle.id"
            class="particle"
            :style="getParticleStyle(conn, particle)"
          ></div>
        </template>
      </div>
      
      <!-- Agent节点 -->
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="agent-node"
        :class="{ 
          thinking: agent.isThinking,
          'has-opinion': agent.opinion,
          'red-flag': hasRedFlag && agent.id === 'safety'
        }"
        :style="getNodeStyle(agent)"
      >
        <div class="node-icon">{{ agent.icon }}</div>
        <div class="node-name">{{ agent.name }}</div>
        <div v-if="agent.opinion" class="node-opinion">{{ agent.opinion }}</div>
        <div v-if="agent.isThinking" class="thinking-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <!-- 中央协调器 -->
      <div
        class="coordinator-node"
        :class="{ active: coordinator.isActive, consensus: finalConsensus }"
        :style="getCoordinatorStyle()"
      >
        <div class="coordinator-core">
          <div class="core-ring"></div>
          <div class="core-center">🧠</div>
        </div>
        <div class="coordinator-label">总协调器</div>
        <div v-if="finalConsensus" class="consensus-badge">
          已达成共识
        </div>
      </div>
    </div>
    
    <!-- DI可视化条 -->
    <div v-if="currentRound > 0" class="di-visualization">
      <div class="di-label">分歧指数 (Dissent Index)</div>
      <div class="di-bar-container">
        <div 
          class="di-bar" 
          :style="{ width: `${diIntensity * 100}%` }"
          :class="{
            low: diIntensity < 0.2,
            medium: diIntensity >= 0.2 && diIntensity < 0.4,
            high: diIntensity >= 0.4 && diIntensity < 0.7,
            critical: diIntensity >= 0.7
          }"
        ></div>
      </div>
      <div class="di-legend">
        <span>一致</span>
        <span>轻度</span>
        <span>深度</span>
        <span>升级</span>
      </div>
    </div>
    
    <!-- 图例 -->
    <div class="network-legend">
      <div class="legend-item">
        <div class="legend-dot" style="background: #ff6b6b;"></div>
        <span>心血管专家</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot" style="background: #4ecdc4;"></div>
        <span>全科医师</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot" style="background: #ffe66d;"></div>
        <span>代谢专家</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot" style="background: #a8e6cf;"></div>
        <span>安全审查</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.neural-network-container {
  position: relative;
  width: 100%;
  height: 500px;
  background: linear-gradient(135deg, #0a0e1a 0%, #1a1f35 50%, #0f1420 100%);
  border-radius: 16px;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

/* 背景网格 */
.grid-background {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(100, 150, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100, 150, 255, 0.03) 1px, transparent 1px);
  background-size: 30px 30px;
  pointer-events: none;
}

/* 头部 */
.network-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
  z-index: 10;
}

.title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #e0e6ed;
  text-shadow: 0 0 20px rgba(100, 200, 255, 0.5);
}

.pulse-dot {
  width: 10px;
  height: 10px;
  background: #00ff88;
  border-radius: 50%;
  box-shadow: 0 0 10px #00ff88, 0 0 20px #00ff88;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.status-bar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.status-item {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #8b92a8;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.status-item.active {
  background: rgba(0, 255, 136, 0.15);
  color: #00ff88;
  border-color: rgba(0, 255, 136, 0.3);
  animation: glow 2s ease-in-out infinite;
}

.status-item.red-flag {
  background: rgba(255, 50, 50, 0.2);
  color: #ff4444;
  border-color: rgba(255, 50, 50, 0.4);
  animation: redPulse 1s ease-in-out infinite;
}

.status-item.dissent {
  background: rgba(255, 200, 50, 0.15);
  color: #ffc800;
  border-color: rgba(255, 200, 50, 0.3);
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px rgba(0, 255, 136, 0.3); }
  50% { box-shadow: 0 0 15px rgba(0, 255, 136, 0.6); }
}

@keyframes redPulse {
  0%, 100% { box-shadow: 0 0 5px rgba(255, 50, 50, 0.3); }
  50% { box-shadow: 0 0 20px rgba(255, 50, 50, 0.8); }
}

/* 网络画布 */
.network-canvas {
  position: absolute;
  inset: 60px 20px 120px 20px;
}

.connections-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.connection-line {
  fill: none;
  stroke: #64c8ff;
  stroke-linecap: round;
  transition: all 0.3s ease;
}

/* 粒子层 */
.particles-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, #64c8ff 0%, transparent 70%);
  box-shadow: 0 0 6px #64c8ff, 0 0 12px #64c8ff;
  transform: translate(-50%, -50%);
  transition: opacity 0.2s ease;
}

/* Agent节点 */
.agent-node {
  position: absolute;
  width: 100px;
  padding: 12px;
  background: rgba(20, 25, 40, 0.9);
  border: 2px solid;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  cursor: pointer;
  z-index: 5;
}

.agent-node:hover {
  transform: translate(-50%, -50%) scale(1.1) !important;
  z-index: 6;
}

.agent-node.thinking {
  animation: nodePulse 1.5s ease-in-out infinite;
}

.agent-node.has-opinion {
  background: rgba(30, 40, 60, 0.95);
}

.agent-node.red-flag {
  border-color: #ff0000 !important;
  animation: redAlert 0.5s ease-in-out infinite;
}

@keyframes nodePulse {
  0%, 100% { box-shadow: 0 0 20px currentColor; }
  50% { box-shadow: 0 0 40px currentColor, 0 0 60px currentColor; }
}

@keyframes redAlert {
  0%, 100% { box-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000; }
  50% { box-shadow: 0 0 40px #ff0000, 0 0 80px #ff0000, 0 0 120px #ff0000; }
}

.node-icon {
  font-size: 28px;
  filter: drop-shadow(0 0 10px currentColor);
}

.node-name {
  font-size: 12px;
  font-weight: 600;
  color: #e0e6ed;
  text-align: center;
}

.node-opinion {
  font-size: 10px;
  color: #8b92a8;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinking-indicator {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.thinking-indicator span {
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  animation: thinkingBounce 1.4s ease-in-out infinite both;
}

.thinking-indicator span:nth-child(1) { animation-delay: -0.32s; }
.thinking-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes thinkingBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* 协调器 */
.coordinator-node {
  position: absolute;
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.3s ease;
}

.coordinator-core {
  position: relative;
  width: 80px;
  height: 80px;
}

.core-ring {
  position: absolute;
  inset: 0;
  border: 3px solid rgba(100, 200, 255, 0.5);
  border-radius: 50%;
  border-top-color: #64c8ff;
  animation: spin 3s linear infinite;
}

.coordinator-node.active .core-ring {
  animation: spin 1s linear infinite;
  border-color: rgba(0, 255, 136, 0.5);
  border-top-color: #00ff88;
}

.coordinator-node.consensus .core-ring {
  border-color: rgba(255, 200, 50, 0.5);
  border-top-color: #ffc800;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.core-center {
  position: absolute;
  inset: 15px;
  background: radial-gradient(circle, rgba(100, 200, 255, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  filter: drop-shadow(0 0 20px rgba(100, 200, 255, 0.8));
}

.coordinator-label {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #64c8ff;
  text-shadow: 0 0 10px rgba(100, 200, 255, 0.5);
}

.consensus-badge {
  margin-top: 6px;
  padding: 3px 10px;
  background: rgba(255, 200, 50, 0.2);
  border: 1px solid rgba(255, 200, 50, 0.4);
  border-radius: 20px;
  font-size: 10px;
  color: #ffc800;
}

/* DI可视化 */
.di-visualization {
  position: absolute;
  bottom: 60px;
  left: 20px;
  right: 20px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.di-label {
  font-size: 12px;
  color: #8b92a8;
  margin-bottom: 8px;
}

.di-bar-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.di-bar {
  height: 100%;
  border-radius: 4px;
  transition: all 0.5s ease;
  box-shadow: 0 0 10px currentColor;
}

.di-bar.low {
  background: linear-gradient(90deg, #00ff88, #00cc6a);
  color: #00ff88;
}

.di-bar.medium {
  background: linear-gradient(90deg, #ffc800, #ff9500);
  color: #ffc800;
}

.di-bar.high {
  background: linear-gradient(90deg, #ff6b35, #ff4422);
  color: #ff6b35;
}

.di-bar.critical {
  background: linear-gradient(90deg, #ff2222, #cc0000);
  color: #ff2222;
  animation: criticalPulse 0.5s ease-in-out infinite;
}

@keyframes criticalPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.di-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10px;
  color: #5a6078;
}

/* 图例 */
.network-legend {
  position: absolute;
  bottom: 16px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #8b92a8;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

/* 响应式 */
@media (max-width: 768px) {
  .neural-network-container {
    height: 400px;
  }
  
  .network-header {
    flex-direction: column;
    gap: 10px;
    padding: 12px;
  }
  
  .status-bar {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .agent-node {
    width: 80px;
    padding: 8px;
  }
  
  .node-icon {
    font-size: 22px;
  }
  
  .node-name {
    font-size: 10px;
  }
  
  .coordinator-node {
    width: 90px;
    height: 90px;
  }
  
  .coordinator-core {
    width: 60px;
    height: 60px;
  }
  
  .core-center {
    font-size: 28px;
  }
}
</style>
