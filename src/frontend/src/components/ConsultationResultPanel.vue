<script setup lang="ts">
import type {
  AgentOpinion,
  ExplainableReport,
  StructuredTriageResult,
  TriageRoutingInfo,
} from '@copilot-care/shared/types';
import {
  formatCollaboration,
  formatDepartment,
  formatRouteMode,
} from '../constants/triageLabels';

interface Props {
  routeInfo: TriageRoutingInfo | null;
  triageResult: StructuredTriageResult | null;
  explainableReport: ExplainableReport | null;
  finalConsensus: AgentOpinion | null;
  resultNotes: string[];
  isSafetyBlocked: boolean;
  safetyBlockNote: string;
  canExportReport: boolean;
  exportingReport: boolean;
  reportExportError: string;
  reportExportSuccess: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  export: [];
}>();

function handleExport(): void {
  emit('export');
}
</script>

<template>
  <div class="panel-card">
    <div class="panel-header-with-action">
      <h3>结构化结果</h3>
      <button
        v-if="props.triageResult || props.explainableReport"
        class="export-btn"
        :disabled="!props.canExportReport"
        @click="handleExport"
      >
        {{ props.exportingReport ? '导出中...' : '导出报告' }}
      </button>
    </div>
    <p v-if="props.routeInfo">
      分流：{{ formatRouteMode(props.routeInfo.routeMode) }} /
      {{ formatDepartment(props.routeInfo.department) }} /
      {{ formatCollaboration(props.routeInfo.collaborationMode) }} /
      复杂度 {{ props.routeInfo.complexityScore }}
    </p>
    <p v-if="props.triageResult">
      分诊等级：{{ props.triageResult.triageLevel }} /
      去向：{{ props.triageResult.destination }} /
      随访：{{ props.triageResult.followupDays }} 天
    </p>
    <p v-if="props.finalConsensus">最终结论：{{ props.finalConsensus.reasoning }}</p>
    <div v-if="props.isSafetyBlocked" class="safety-block-alert">
      <strong>安全审校已阻断线上建议</strong>
      <p>{{ props.safetyBlockNote || '检测到潜在不安全输出，已切换为线下上转路径。' }}</p>
    </div>
    <ul v-if="props.resultNotes.length > 0" class="reasoning-list">
      <li v-for="(note, index) in props.resultNotes" :key="`note-${index}`">
        {{ note }}
      </li>
    </ul>
    <p v-if="props.reportExportError" class="export-status error">
      {{ props.reportExportError }}
    </p>
    <p v-else-if="props.reportExportSuccess" class="export-status success">
      {{ props.reportExportSuccess }}
    </p>
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

.panel-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-header-with-action h3 {
  margin: 0;
}

.export-btn {
  padding: 6px 14px;
  background: #0e8d8f;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.export-btn:hover {
  background: #0a6e70;
}

.export-btn:disabled {
  background: #86a9ab;
  cursor: not-allowed;
}

.safety-block-alert {
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e0a18c;
  background: #fff4ef;
  color: #9b3f25;
}

.safety-block-alert strong {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
}

.safety-block-alert p {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
}

.reasoning-list {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: #3c5b75;
  line-height: 1.5;
}

.export-status {
  margin: 10px 0 0;
  font-size: 12px;
}

.export-status.error {
  color: #b23f29;
}

.export-status.success {
  color: #1e7e58;
}
</style>


