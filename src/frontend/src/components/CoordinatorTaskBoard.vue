<script setup lang="ts">
import type { OrchestrationTask } from '@copilot-care/shared/types';

interface Props {
  phaseText: string;
  sourceText: string;
  updatedAtText: string;
  summary: string;
  activeTaskHint: string;
  tasks: OrchestrationTask[];
}

const props = defineProps<Props>();

const TASK_STATUS_LABELS: Record<OrchestrationTask['status'], string> = {
  pending: '待执行',
  running: '进行中',
  done: '已完成',
  blocked: '阻断',
};

function formatTaskStatus(statusValue: OrchestrationTask['status']): string {
  return TASK_STATUS_LABELS[statusValue] ?? statusValue;
}

function formatTaskProgress(value: number): string {
  const bounded = Math.max(0, Math.min(100, value));
  return `${Math.round(bounded)}%`;
}

function taskProgressStyle(task: OrchestrationTask): { width: string } {
  const bounded = Math.max(0, Math.min(100, task.progress));
  return {
    width: `${bounded}%`,
  };
}
</script>

<template>
  <div class="panel-card">
    <div class="panel-head-row">
      <h3>总Agent任务看板</h3>
      <div class="panel-head-actions">
        <span class="status-chip">{{ props.phaseText }}</span>
        <span class="status-chip secondary">{{ props.sourceText }}</span>
      </div>
    </div>
    <p class="status-line">最近快照：{{ props.updatedAtText }}</p>
    <p class="status-line">{{ props.summary }}</p>
    <p class="status-line">当前执行：{{ props.activeTaskHint }}</p>
    <div class="task-list">
      <article
        v-for="task in props.tasks"
        :key="task.taskId"
        class="task-item"
        :class="task.status"
      >
        <div class="task-head">
          <strong>{{ task.roleName }}</strong>
          <span class="task-status">{{ formatTaskStatus(task.status) }}</span>
        </div>
        <p>{{ task.objective }}</p>
        <small v-if="task.latestUpdate" class="task-update">{{ task.latestUpdate }}</small>
        <small class="task-progress-text">进度：{{ formatTaskProgress(task.progress) }}</small>
        <div class="task-progress">
          <div class="task-progress-fill" :style="taskProgressStyle(task)" />
        </div>
      </article>
      <p v-if="props.tasks.length === 0" class="empty-text">等待总Agent分配任务...</p>
    </div>
  </div>
</template>

<style scoped>
.panel-card {
  background: #ffffff;
  border: 1px solid #cad6e2;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 6px 18px rgba(17, 44, 72, 0.06);
}

.panel-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-chip {
  font-size: 12px;
  color: #0f5e65;
  background: #e8f7f7;
  border: 1px solid #a8d8dc;
  border-radius: 999px;
  padding: 2px 10px;
}

.status-chip.secondary {
  color: #2f5878;
  background: #eef5ff;
  border-color: #bdd0e4;
}

.status-line {
  margin: 6px 0;
  font-size: 13px;
  color: #3e5d77;
}

.task-list {
  display: grid;
  gap: 8px;
}

.task-item {
  border: 1px solid #d2dde8;
  border-radius: 9px;
  padding: 9px 10px;
  background: #f8fbfe;
}

.task-item.running {
  border-color: #0e8d8f;
  background: #eaf6f6;
}

.task-item.done {
  border-color: #2e9156;
  background: #edf9f1;
}

.task-item.blocked {
  border-color: #c3472a;
  background: #fff1ed;
}

.task-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-status {
  font-size: 11px;
  border: 1px solid #c7d5e4;
  border-radius: 999px;
  padding: 1px 8px;
  color: #375672;
  background: #f7fbff;
}

.task-item p {
  margin: 5px 0 0;
  font-size: 13px;
  color: #3c5b75;
}

.task-update {
  display: block;
  margin-top: 4px;
  color: #617c95;
  font-size: 12px;
}

.task-progress-text {
  display: block;
  margin-top: 5px;
  color: #496a86;
  font-size: 12px;
}

.task-progress {
  margin-top: 7px;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #d9e5f1;
  overflow: hidden;
}

.task-progress-fill {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #2e9156 0%, #0e8d8f 100%);
  transition: width 220ms ease;
}

.empty-text {
  margin: 0;
  font-size: 13px;
  color: #6a8196;
}
</style>
