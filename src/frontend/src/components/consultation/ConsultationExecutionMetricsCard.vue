<script setup lang="ts">
import type { WorkflowStage } from '@copilot-care/shared/types';
import type { TriageStreamStageStatus } from '@copilot-care/shared/types';

interface StageLegendItem {
  stage: WorkflowStage;
  label: string;
  status: TriageStreamStageStatus;
  message: string;
}

interface ConsultationExecutionMetricsCardProps {
  currentStageLabel: string;
  progressPercent: number;
  doneStageCount: number;
  runningStageCount: number;
  blockedStageCount: number;
  stageLegend: StageLegendItem[];
  formatStageDuration: (stage: WorkflowStage) => string;
}

defineProps<ConsultationExecutionMetricsCardProps>();
</script>

<template>
  <div class="panel-card">
    <div class="panel-head-row">
      <h3>阶段执行指标板</h3>
      <span class="status-chip">{{ currentStageLabel }}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: `${progressPercent}%` }" />
    </div>
    <div class="execution-summary-row">
      <span class="summary-pill done">完成 {{ doneStageCount }}</span>
      <span class="summary-pill running">进行中 {{ runningStageCount }}</span>
      <span class="summary-pill blocked">阻塞 {{ blockedStageCount }}</span>
    </div>
    <div class="stage-legend">
      <article
        v-for="item in stageLegend"
        :key="item.stage"
        class="stage-item"
        :class="item.status"
      >
        <div class="stage-item-head">
          <strong>{{ item.label }}</strong>
          <span>{{ item.status }}</span>
        </div>
        <p>{{ item.message }}</p>
        <small>耗时 {{ formatStageDuration(item.stage) }}</small>
      </article>
    </div>
  </div>
</template>

<style scoped>
.panel-card {
  background: var(--card);
  border: 1px solid var(--line);
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

.status-chip {
  font-size: 12px;
  color: #0f5e65;
  background: #e8f7f7;
  border: 1px solid #a8d8dc;
  border-radius: 999px;
  padding: 2px 10px;
}

.progress-track {
  margin: 8px 0 10px;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #d9e5f1;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2e9156 0%, #0e8d8f 100%);
  transition: width 220ms ease;
}

.execution-summary-row {
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-pill {
  font-size: 12px;
  border-radius: 999px;
  padding: 3px 10px;
  border: 1px solid transparent;
}

.summary-pill.done {
  color: #1f6a43;
  background: #e7f6ee;
  border-color: #9fd6b9;
}

.summary-pill.running {
  color: #1b4f76;
  background: #e8f3ff;
  border-color: #9ec1e1;
}

.summary-pill.blocked {
  color: #8c2f1c;
  background: #ffece7;
  border-color: #efb8ab;
}

.stage-legend {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 8px;
}

.stage-item {
  border: 1px solid #d2dde8;
  border-radius: 8px;
  padding: 8px;
  background: #f8fbfe;
}

.stage-item.running {
  border-color: #0e8d8f;
  background: #eaf6f6;
}

.stage-item.done {
  border-color: #2e9156;
  background: #edf9f1;
}

.stage-item.failed {
  border-color: #c3472a;
  background: #fff1ed;
}

.stage-item.skipped {
  border-color: #bf8c1f;
  background: #fff7e5;
}

.stage-item p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.stage-item small {
  margin-top: 6px;
  display: block;
  color: #698198;
  font-size: 11px;
}

.stage-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.stage-item-head span {
  font-size: 11px;
  color: #62809d;
}
</style>
