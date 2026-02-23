<script setup lang="ts">
import { computed } from 'vue';
import type { DemoStep } from '../composables/useDemoMode';

const props = defineProps<{
  steps: DemoStep[];
  currentStepIndex: number;
  isDemoMode: boolean;
  isPaused: boolean;
  autoPlay: boolean;
  speed: number;
}>();

const emit = defineEmits<{
  (e: 'toggle-demo'): void;
  (e: 'toggle-pause'): void;
  (e: 'toggle-auto'): void;
  (e: 'reset'): void;
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'go-to', index: number): void;
  (e: 'set-speed', speed: number): void;
  (e: 'exit'): void;
}>();

const progress = computed(() => {
  if (props.steps.length === 0) return 0;
  return ((props.currentStepIndex + 1) / props.steps.length) * 100;
});

function getStepStatus(index: number): 'completed' | 'current' | 'pending' {
  if (index < props.currentStepIndex) return 'completed';
  if (index === props.currentStepIndex) return 'current';
  return 'pending';
}
</script>

<template>
  <Transition name="demo-slide">
    <div v-if="isDemoMode" class="demo-mode-panel">
      <header class="demo-header">
        <div class="demo-title">
          <span class="demo-icon">演示</span>
          <span>答辩演示模式</span>
        </div>
        <button class="close-btn" @click="emit('exit')">关闭</button>
      </header>

      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>

      <div class="demo-content">
        <div class="step-indicator">
          <span class="current-index">{{ currentStepIndex + 1 }}</span>
          <span class="separator">/</span>
          <span class="total-steps">{{ steps.length }}</span>
        </div>

        <Transition name="step-fade" mode="out-in">
          <div :key="currentStepIndex" class="step-detail">
            <h4>{{ steps[currentStepIndex]?.title || '' }}</h4>
            <p>{{ steps[currentStepIndex]?.description || '' }}</p>
            <div v-if="steps[currentStepIndex]?.reasoning" class="reasoning">
              <span class="reasoning-label">推理说明：</span>
              <span>{{ steps[currentStepIndex]?.reasoning }}</span>
            </div>
            <div v-if="steps[currentStepIndex]?.highlight?.length" class="highlights">
              <span
                v-for="tag in steps[currentStepIndex]?.highlight"
                :key="tag"
                class="highlight-tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </Transition>
      </div>

      <nav class="demo-timeline">
        <button
          v-for="(step, index) in steps"
          :key="step.id"
          class="timeline-dot"
          :class="getStepStatus(index)"
          :title="step.title"
          @click="emit('go-to', index)"
        >
          <span class="dot-inner"></span>
        </button>
      </nav>

      <div class="demo-controls">
        <div class="control-group">
          <button class="ctrl-btn" @click="emit('prev')" :disabled="currentStepIndex === 0">
            上一步
          </button>
          <button class="ctrl-btn play" @click="emit('toggle-pause')">
            {{ isPaused ? '继续' : '暂停' }}
          </button>
          <button
            class="ctrl-btn"
            @click="emit('next')"
            :disabled="currentStepIndex >= steps.length - 1"
          >
            下一步
          </button>
          <button class="ctrl-btn" @click="emit('reset')">重置</button>
        </div>

        <div class="control-group">
          <button
            class="ctrl-btn auto"
            :class="{ active: autoPlay }"
            @click="emit('toggle-auto')"
          >
            {{ autoPlay ? '关闭自动' : '开启自动' }}
          </button>
        </div>

        <div class="control-group speed-group">
          <span class="speed-label">速度：</span>
          <button
            v-for="s in [0.5, 1, 2]"
            :key="s"
            class="speed-btn"
            :class="{ active: speed === s }"
            @click="emit('set-speed', s)"
          >
            {{ s }}x
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.demo-mode-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #1a3a4d 0%, #0d1b2a 100%);
  border-top: 2px solid #0e8d8f;
  z-index: 1000;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
}

.demo-slide-enter-active,
.demo-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.demo-slide-enter-from,
.demo-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.demo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #2f4f68;
}

.demo-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f7fbff;
  font-weight: 600;
}

.demo-icon {
  border-radius: 999px;
  border: 1px solid #4f6f8a;
  padding: 2px 8px;
  font-size: 11px;
}

.close-btn {
  background: none;
  border: 1px solid #4f6f8a;
  color: #b7c8d8;
  font-size: 12px;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 999px;
}

.close-btn:hover {
  color: #f7fbff;
  border-color: #7e9ab4;
}

.progress-bar {
  height: 3px;
  background: #2f4f68;
}

.progress-fill {
  height: 100%;
  background: #0e8d8f;
  transition: width 0.3s ease;
}

.demo-content {
  padding: 16px 20px;
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.step-indicator {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: #7e92a8;
  font-size: 14px;
  min-width: 60px;
}

.current-index {
  font-size: 24px;
  font-weight: 600;
  color: #0e8d8f;
}

.separator {
  color: #4b6080;
}

.total-steps {
  color: #6b7f96;
}

.step-detail {
  flex: 1;
}

.step-detail h4 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #f7fbff;
}

.step-detail p {
  margin: 0 0 12px;
  color: #b8c9d9;
  font-size: 14px;
  line-height: 1.5;
}

.reasoning {
  background: #132738;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.reasoning-label {
  color: #7e92a8;
  font-size: 12px;
  display: block;
  margin-bottom: 4px;
}

.reasoning span:last-child {
  color: #b8c9d9;
  font-size: 13px;
}

.highlights {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.highlight-tag {
  padding: 4px 12px;
  background: rgba(14, 141, 143, 0.2);
  border: 1px solid #0e8d8f;
  border-radius: 999px;
  font-size: 12px;
  color: #0e8d8f;
}

.demo-timeline {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 12px 20px;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
}

.dot-inner {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4b6080;
  transition: all 0.2s;
}

.timeline-dot.current .dot-inner {
  background: #0e8d8f;
  box-shadow: 0 0 8px #0e8d8f;
  transform: scale(1.3);
}

.timeline-dot.completed .dot-inner {
  background: #2e9156;
}

.demo-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 12px 20px;
  border-top: 1px solid #2f4f68;
  background: rgba(0, 0, 0, 0.2);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-btn {
  padding: 8px 14px;
  background: #132738;
  border: 1px solid #2f4f68;
  border-radius: 6px;
  color: #b8c9d9;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.ctrl-btn:hover:not(:disabled) {
  background: #1a3a4d;
  border-color: #0e8d8f;
}

.ctrl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ctrl-btn.play {
  background: #0e8d8f;
  border-color: #0e8d8f;
  color: #ffffff;
}

.ctrl-btn.auto.active {
  background: #2e9156;
  border-color: #2e9156;
  color: #ffffff;
}

.speed-group {
  gap: 4px;
}

.speed-label {
  color: #7e92a8;
  font-size: 12px;
}

.speed-btn {
  padding: 6px 10px;
  background: #132738;
  border: 1px solid #2f4f68;
  border-radius: 4px;
  color: #7e92a8;
  font-size: 11px;
  cursor: pointer;
}

.speed-btn.active {
  background: #0e8d8f;
  border-color: #0e8d8f;
  color: #ffffff;
}

.step-fade-enter-active,
.step-fade-leave-active {
  transition: opacity 0.2s ease;
}

.step-fade-enter-from,
.step-fade-leave-to {
  opacity: 0;
}
</style>
