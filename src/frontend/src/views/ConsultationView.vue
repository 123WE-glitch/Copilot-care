<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { WorkflowStage } from '@copilot-care/shared/types';
import {
  useDemoMode,
  createDemoStepsFromReasoning,
  createCompetitionDemoScript,
} from '../composables/useDemoMode';
import { useConsultationChartRuntime } from '../composables/useConsultationChartRuntime';
import { useConsultationStreamState } from '../composables/useConsultationStreamState';
import { useConsultationReportExport } from '../composables/useConsultationReportExport';
import { useConsultationSessionRunner } from '../composables/useConsultationSessionRunner';
import { useConsultationViewModel } from '../composables/useConsultationViewModel';
import { useConsultationViewSync } from '../composables/useConsultationViewSync';
import { useConsultationReasoningMap } from '../composables/useConsultationReasoningMap';
import { useDecisionReasoningCockpit } from '../composables/useDecisionReasoningCockpit';
import { useSplitPaneLayout } from '../composables/useSplitPaneLayout';
import {
  useConsultationInputForm,
  type ConsultationQuickInput,
} from '../composables/useConsultationInputForm';
import {
  type ConsultationReasoningKind,
  type ConsultationStageRuntimeState,
} from '../composables/useConsultationCharts';
import WorkflowStateMachine from '../components/WorkflowStateMachine.vue';
import ComplexityRoutingTree from '../components/ComplexityRoutingTree.vue';
import ReasoningTraceTimeline from '../components/ReasoningTraceTimeline.vue';
import ThinkingGraph from '../components/ThinkingGraph.vue';
import DemoModePanel from '../components/DemoModePanel.vue';
import CoordinatorTaskBoard from '../components/CoordinatorTaskBoard.vue';
import ConsultationResultPanel from '../components/ConsultationResultPanel.vue';
import NeuralNetworkVisualization from '../components/NeuralNetworkVisualization.vue';
import ConsultationInputPanel from '../components/consultation/ConsultationInputPanel.vue';
import ConsultationDecisionPathCard from '../components/consultation/ConsultationDecisionPathCard.vue';
import ConsultationReasoningCockpitCard from '../components/consultation/ConsultationReasoningCockpitCard.vue';
import ConsultationExecutionMetricsCard from '../components/consultation/ConsultationExecutionMetricsCard.vue';
import {
  COLLABORATION_LABELS,
  DEPARTMENT_LABELS,
  ROUTE_MODE_LABELS,
} from '../constants/triageLabels';
import {
  CONSULTATION_REASONING_KIND_LABELS,
  CONSULTATION_REQUIRED_FIELD_LABELS,
  CONSULTATION_SNAPSHOT_PHASE_LABELS,
  CONSULTATION_STAGE_LABELS,
  CONSULTATION_STATUS_LABELS,
  type ConsultationViewUiStatus,
} from '../constants/consultationCopy';

type UiStatus = ConsultationViewUiStatus;
type ReasoningKind = ConsultationReasoningKind;

interface ChatMessage {
  role: 'user' | 'system';
  content: string;
}

interface StageRuntimeState extends ConsultationStageRuntimeState {
  message: string;
  startTime?: string;
  endTime?: string;
  durationMs?: number;
}

const FLOW_STAGES: WorkflowStage[] = [
  'START',
  'INFO_GATHER',
  'RISK_ASSESS',
  'ROUTING',
  'DEBATE',
  'CONSENSUS',
  'REVIEW',
  'OUTPUT',
  'ESCALATION',
];
const CORE_STAGES: WorkflowStage[] = [
  'START',
  'INFO_GATHER',
  'RISK_ASSESS',
  'ROUTING',
  'DEBATE',
  'CONSENSUS',
  'REVIEW',
  'OUTPUT',
];

const STAGE_LABELS: Record<WorkflowStage, string> = CONSULTATION_STAGE_LABELS;
const STATUS_LABELS: Record<UiStatus, string> = CONSULTATION_STATUS_LABELS;
const REQUIRED_FIELD_LABELS: Record<string, string> =
  CONSULTATION_REQUIRED_FIELD_LABELS;
const REASONING_KIND_LABELS: Record<ReasoningKind, string> =
  CONSULTATION_REASONING_KIND_LABELS;
const SNAPSHOT_PHASE_LABELS = CONSULTATION_SNAPSHOT_PHASE_LABELS;

const QUICK_INPUTS: ConsultationQuickInput[] = [
  {
    label: '血压波动',
    symptomText: '头晕，血压偏高，近期偶发乏力',
    age: 56,
    sex: 'male',
    systolicBPText: '148',
    diastolicBPText: '95',
    chronicDiseasesText: 'Hypertension',
    medicationHistoryText: 'amlodipine',
  },
  {
    label: '红旗排查',
    symptomText: '胸痛，呼吸困难，出冷汗',
    age: 68,
    sex: 'male',
    systolicBPText: '182',
    diastolicBPText: '112',
    chronicDiseasesText: 'Hypertension, Diabetes',
    medicationHistoryText: 'metformin',
  },
  {
    label: '代谢评估',
    symptomText: '近期乏力，多饮多尿，体重下降',
    age: 49,
    sex: 'female',
    systolicBPText: '138',
    diastolicBPText: '88',
    chronicDiseasesText: 'Prediabetes',
  },
];

function createInitialStageRuntime(): Record<WorkflowStage, StageRuntimeState> {
  return {
    START: { status: 'pending', message: '等待启动' },
    INFO_GATHER: { status: 'pending', message: '等待采集信息' },
    RISK_ASSESS: { status: 'pending', message: '等待风险评估' },
    ROUTING: { status: 'pending', message: '等待分流决策' },
    DEBATE: { status: 'pending', message: '等待讨论' },
    CONSENSUS: { status: 'pending', message: '等待共识收敛' },
    REVIEW: { status: 'pending', message: '等待审校复核' },
    OUTPUT: { status: 'pending', message: '等待输出' },
    ESCALATION: { status: 'pending', message: '按需触发' },
  };
}

function formatRequiredField(field: string): string {
  return REQUIRED_FIELD_LABELS[field] ?? field;
}

function classifyReasoningKind(message: string): ReasoningKind {
  const text = message.toLowerCase();
  if (/缺少|补充|required|missing/.test(text)) return 'query';
  if (/错误|异常|红旗|上转|阻断|风险/.test(text)) return 'warning';
  if (/路由|分诊|复杂度|决策|切换|会诊模式/.test(text)) return 'decision';
  if (/证据|依据|指标|评估|指数|检验|化验/.test(text)) return 'evidence';
  return 'system';
}

const {
  layoutRef,
  leftPaneStyle,
  startDragging,
  handleDragging,
  stopDragging,
} = useSplitPaneLayout({
  storageKey: 'copilot-care.split-left-ratio',
  minRatio: 30,
  maxRatio: 70,
  defaultRatio: 42,
});

let reasoningMapNodeClickDelegate: ((nodeId: string) => void) | null = null;
let resetReasoningMapSelectionDelegate: (() => void) | null = null;

function onReasoningMapNodeClick(nodeId: string): void {
  reasoningMapNodeClickDelegate?.(nodeId);
}

const reasoningMapRef = ref<HTMLElement | null>(null);
const {
  reasoningMapChart,
  initializeCharts,
  resizeCharts,
  disposeCharts,
} = useConsultationChartRuntime({
  reasoningMapRef,
  onReasoningMapNodeClick,
});

const {
  form,
  showAdvancedInputs,
  setAdvancedInputsVisible,
  toggleAdvancedInputs,
  applyQuickInput: applyFormQuickInput,
  buildRequestPayload,
  buildExportPatientProfile,
  validateInput,
} = useConsultationInputForm({
  contextVersion: 'v4.30',
  validationMessages: {
    symptomRequired: '请先输入当前症状或需求描述。',
    ageInvalid: '年龄必须是有效数字。',
    systolicNotGreaterThanDiastolic: '收缩压应大于舒张压。',
  },
});

const status = ref<UiStatus>('IDLE');
const microStatus = ref('等待输入需求。');
const {
  clarificationQuestion,
  requiredFields,
  systemError,
  stageRuntime,
  reasoningItems,
  rounds,
  finalConsensus,
  triageResult,
  routeInfo,
  routingPreview,
  explainableReport,
  resultNotes,
  orchestrationSnapshot,
  captureRoutingFromText,
  rememberStageEvent,
  rememberReasoning,
  shouldPushStageNarrative,
  pushReasoning,
  updateStage,
  resetStreamStateCore,
} = useConsultationStreamState({
  createInitialStageRuntime,
});

const messages = ref<ChatMessage[]>([
  {
    role: 'system',
    content: '您好，我是 CoPilot Care。请先输入当前症状或主要需求。',
  },
]);

const selectedStageDetail = ref<WorkflowStage | null>(null);
const patientInsights = ref<string[]>([]);
const patientId = ref<string>('');

const demoMode = useDemoMode();
const competitionDemoScript = createCompetitionDemoScript();

const {
  loading,
  loadingSeconds,
  typedOutput,
  submitConsultation,
  disposeSessionRunner,
} = useConsultationSessionRunner({
  status,
  microStatus,
  showAdvancedInputs,
  messages,
  streamState: {
    clarificationQuestion,
    requiredFields,
    systemError,
    stageRuntime,
    reasoningItems,
    rounds,
    finalConsensus,
    triageResult,
    routeInfo,
    routingPreview,
    explainableReport,
    resultNotes,
    orchestrationSnapshot,
    captureRoutingFromText,
    rememberStageEvent,
    rememberReasoning,
    shouldPushStageNarrative,
    pushReasoning,
    updateStage,
    resetStreamStateCore,
  },
  validateInput,
  buildRequestPayload,
  classifyReasoningKind,
  formatRequiredField,
  stageLabels: STAGE_LABELS,
  statusLabels: STATUS_LABELS,
  snapshotPhaseLabels: SNAPSHOT_PHASE_LABELS,
  createDemoSteps: createDemoStepsFromReasoning,
  initDemoSteps: demoMode.initSteps,
  onResetView: () => {
    resetReasoningMapSelectionDelegate?.();
  },
});

const {
  exportingReport,
  reportExportError,
  reportExportSuccess,
  canExportReport,
  prefetchReportExporter,
  handleExportReport,
} = useConsultationReportExport({
  hasExportableContent: () => {
    return !!triageResult.value
      || !!explainableReport.value
      || typedOutput.value.trim().length > 0;
  },
  buildReportData: () => {
    return {
      patientProfile: buildExportPatientProfile(),
      triageResult: triageResult.value,
      routing: routeInfo.value,
      explainableReport: explainableReport.value,
      conclusion: typedOutput.value,
      actions: explainableReport.value?.actions || [],
      evidence: explainableReport.value?.basis || [],
      notes: resultNotes.value,
    };
  },
});

const hasPrefetchedReportExporter = ref(false);
watch(
  canExportReport,
  (canExport) => {
    if (!canExport || hasPrefetchedReportExporter.value) {
      return;
    }

    hasPrefetchedReportExporter.value = true;
    void prefetchReportExporter();
  },
  { immediate: true },
);

const {
  statusText,
  safetyBlockNote,
  isSafetyBlocked,
  coordinatorTasks,
  coordinatorSummary,
  coordinatorUpdatedAtText,
  coordinatorPhaseText,
  coordinatorSourceText,
  coordinatorActiveTaskHint,
  stageLegend,
  currentStageInfo,
  progressPercent,
  pathDepartmentText,
  pathRouteModeText,
  pathCollaborationText,
} = useConsultationViewModel({
  flowStages: FLOW_STAGES,
  coreStages: CORE_STAGES,
  stageLabels: STAGE_LABELS,
  statusLabels: STATUS_LABELS,
  snapshotPhaseLabels: SNAPSHOT_PHASE_LABELS,
  status,
  stageRuntime,
  routeInfo,
  routingPreview,
  resultNotes,
  orchestrationSnapshot,
});

const doneStageCount = computed<number>(() => {
  return stageLegend.value.filter((item) => item.status === 'done').length;
});

const runningStageCount = computed<number>(() => {
  return stageLegend.value.filter((item) => item.status === 'running').length;
});

const blockedStageCount = computed<number>(() => {
  return stageLegend.value.filter((item) => {
    return item.status === 'blocked' || item.status === 'failed';
  }).length;
});

const {
  showEvidenceBranches,
  selectedReasoningNode,
  toggleEvidenceBranches,
  renderReasoningMap,
  handleReasoningMapNodeClick: handleReasoningMapNodeClickFromState,
  resetReasoningMapSelection,
} = useConsultationReasoningMap({
  reasoningMapChart,
  formSymptomText: computed(() => form.value.symptomText),
  routeInfo,
  routingPreview,
  status,
  statusLabels: STATUS_LABELS,
  explainableReport,
  typedOutput,
  orchestrationSnapshot,
  reasoningItems,
  reasoningKindLabels: REASONING_KIND_LABELS,
  routeModeLabels: ROUTE_MODE_LABELS,
  departmentLabels: DEPARTMENT_LABELS,
  collaborationLabels: COLLABORATION_LABELS,
});

const {
  confidenceBadge,
  contributionCards,
  evidenceDigest,
  simulationPresets,
  selectedSimulationId,
  simulationInsight,
  toggleSimulation,
} = useDecisionReasoningCockpit({
  routeInfo,
  routingPreview,
  explainableReport,
  reasoningItems,
  orchestrationSnapshot,
  routeModeLabels: ROUTE_MODE_LABELS,
});

reasoningMapNodeClickDelegate = handleReasoningMapNodeClickFromState;
resetReasoningMapSelectionDelegate = resetReasoningMapSelection;

useConsultationViewSync({
  stageRuntime,
  reasoningItems,
  routeInfo,
  routingPreview,
  status,
  typedOutput,
  explainableReport,
  orchestrationSnapshot,
  requiredFields,
  renderReasoningMap,
  setAdvancedInputsVisible,
});

function applyQuickInput(input: ConsultationQuickInput): void {
  applyFormQuickInput(input, loading.value);
}

function onResize(): void {
  resizeCharts();
}
function isFieldRequired(field: string): boolean {
  return requiredFields.value.includes(field);
}

function handlePatientSelected(patientIdValue: string): void {
  patientId.value = patientIdValue;
}

function handleInsightsLoaded(insights: string[]): void {
  patientInsights.value = insights;
  if (insights.length > 0) {
    pushReasoning('evidence', `患者洞察：${insights.join('，')}`);
  }
}

function handleStageClick(stage: WorkflowStage): void {
  selectedStageDetail.value = stage;
}

function toggleDemoMode(): void {
  if (demoMode.isDemoMode.value) {
    demoMode.exitDemo();
    return;
  }
  if (demoMode.steps.value.length === 0) {
    demoMode.initSteps(competitionDemoScript);
  }
  demoMode.startDemo();
}

function formatStageDuration(stage: WorkflowStage): string {
  const duration = stageRuntime.value[stage]?.durationMs;
  if (typeof duration !== 'number' || duration <= 0) {
    return '--';
  }
  if (duration < 1000) {
    return `${duration}ms`;
  }
  return `${(duration / 1000).toFixed(1)}s`;
}

async function initializeConsultationCharts(): Promise<void> {
  await initializeCharts({
    onReasoningMapReady: renderReasoningMap,
  });
}

onMounted(() => {
  void initializeConsultationCharts();
  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', handleDragging);
  window.addEventListener('mouseup', stopDragging);
});

onBeforeUnmount(() => {
  disposeSessionRunner();
  window.removeEventListener('resize', onResize);
  window.removeEventListener('mousemove', handleDragging);
  window.removeEventListener('mouseup', stopDragging);
  disposeCharts();
});
</script>

<template>
  <div ref="layoutRef" class="split-layout">
    <ConsultationInputPanel
      :left-pane-style="leftPaneStyle"
      :loading="loading"
      :quick-inputs="QUICK_INPUTS"
      :form="form"
      :show-advanced-inputs="showAdvancedInputs"
      :clarification-question="clarificationQuestion"
      :required-fields="requiredFields"
      :messages="messages"
      :micro-status="microStatus"
      :loading-seconds="loadingSeconds"
      :current-stage-label="currentStageInfo.label"
      :progress-percent="progressPercent"
      :demo-mode-enabled="demoMode.isDemoMode.value"
      :is-field-required="isFieldRequired"
      :format-required-field="formatRequiredField"
      @apply-quick-input="applyQuickInput"
      @toggle-advanced-inputs="toggleAdvancedInputs"
      @submit-consultation="submitConsultation"
      @toggle-demo-mode="toggleDemoMode"
      @patient-selected="handlePatientSelected"
      @insights-loaded="handleInsightsLoaded"
    />

    <div class="splitter" @mousedown="startDragging">
      <span class="splitter-grip" />
    </div>

    <section class="right-pane">
      <header class="pane-header">
        <h2>会诊看板</h2>
        <p>流程进度、推理轨迹与决策建议实时同步。</p>
      </header>

      <CoordinatorTaskBoard
        :phase-text="coordinatorPhaseText"
        :source-text="coordinatorSourceText"
        :updated-at-text="coordinatorUpdatedAtText"
        :summary="coordinatorSummary"
        :active-task-hint="coordinatorActiveTaskHint"
        :tasks="coordinatorTasks"
      />

      <!-- 秘塔式动态生长思维导图 -->
      <ThinkingGraph
        :nodes="orchestrationSnapshot?.graph?.nodes || []"
        :edges="orchestrationSnapshot?.graph?.edges || []"
        :tasks="orchestrationSnapshot?.tasks || []"
        :is-running="loading"
      />

      <ConsultationDecisionPathCard
        :status-text="statusText"
        :routing-active="stageRuntime.ROUTING.status !== 'pending'"
        :collaboration-active="stageRuntime.DEBATE.status !== 'pending' || stageRuntime.ESCALATION.status !== 'pending'"
        :path-department-text="pathDepartmentText"
        :path-route-mode-text="pathRouteModeText"
        :path-collaboration-text="pathCollaborationText"
      />

      <ConsultationReasoningCockpitCard
        :confidence-badge="confidenceBadge"
        :contribution-cards="contributionCards"
        :evidence-digest="evidenceDigest"
        :simulation-presets="simulationPresets"
        :selected-simulation-id="selectedSimulationId"
        :simulation-insight="simulationInsight"
        @toggle-simulation="toggleSimulation"
      />

      <!-- 神经网络可视化：多Agent协同 -->
      <div class="panel-card neural-network-card">
        <NeuralNetworkVisualization
          :rounds="rounds"
          :current-round="rounds.length"
          :is-running="loading"
          :has-red-flag="status === 'ESCALATE_TO_OFFLINE'"
          :final-consensus="finalConsensus ? '已达成' : undefined"
        />
      </div>

      <div class="panel-card">
        <div class="panel-head-row">
          <h3>深度推理图</h3>
          <div class="panel-head-actions">
            <button class="ghost-btn" type="button" @click="toggleEvidenceBranches">
              {{ showEvidenceBranches ? '折叠证据分支' : '展开证据分支' }}
            </button>
            <span class="status-chip">{{ currentStageInfo.label }}</span>
          </div>
        </div>
        <div ref="reasoningMapRef" class="reasoning-map-chart" />
        <p class="map-caption">实时映射：优先渲染 AI 动态流程图，缺省回退本地推理图（支持点击节点查看详情）</p>
        <div v-if="selectedReasoningNode" class="map-detail-card">
          <h4>{{ selectedReasoningNode.title }}</h4>
          <p class="map-detail-summary">{{ selectedReasoningNode.summary }}</p>
          <pre
            v-if="selectedReasoningNode.raw && selectedReasoningNode.raw !== selectedReasoningNode.summary"
            class="map-detail-raw"
          >{{ selectedReasoningNode.raw }}</pre>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-head-row">
          <h3>工作流状态机</h3>
          <span class="status-chip">{{ currentStageInfo.label }}</span>
        </div>
        <WorkflowStateMachine
          :stage-runtime="stageRuntime"
          :current-stage="currentStageInfo.stage"
          :has-red-flag="status === 'ESCALATE_TO_OFFLINE'"
          :has-escalation="stageRuntime.ESCALATION.status !== 'pending'"
          @stage-click="handleStageClick"
        />
        <div v-if="selectedStageDetail" class="stage-detail-card">
          <h4>{{ STAGE_LABELS[selectedStageDetail] }}</h4>
          <p>状态：{{ stageRuntime[selectedStageDetail].status }}</p>
          <p>{{ stageRuntime[selectedStageDetail].message }}</p>
        </div>
      </div>

      <div class="panel-card">
        <ComplexityRoutingTree
          :routing="routeInfo ?? routingPreview"
          :has-red-flag="status === 'ESCALATE_TO_OFFLINE'"
          :current-stage="currentStageInfo.stage"
        />
      </div>

      <ConsultationExecutionMetricsCard
        :current-stage-label="currentStageInfo.label"
        :progress-percent="progressPercent"
        :done-stage-count="doneStageCount"
        :running-stage-count="runningStageCount"
        :blocked-stage-count="blockedStageCount"
        :stage-legend="stageLegend"
        :format-stage-duration="formatStageDuration"
      />

      <div class="panel-card">
        <ReasoningTraceTimeline
          :items="reasoningItems"
          :current-stage="currentStageInfo.stage"
          :max-items="100"
        />
        <p v-if="systemError" class="status-line">错误码：{{ systemError }}</p>
      </div>

      <div class="panel-card">
        <h3>生成建议（打字机输出）</h3>
        <pre class="typewriter-output">{{ typedOutput || '等待模型输出...' }}<span v-if="loading" class="typing-caret">|</span></pre>
      </div>

      <ConsultationResultPanel
        v-if="routeInfo || triageResult || finalConsensus"
        :route-info="routeInfo"
        :triage-result="triageResult"
        :explainable-report="explainableReport"
        :final-consensus="finalConsensus"
        :result-notes="resultNotes"
        :is-safety-blocked="isSafetyBlocked"
        :safety-block-note="safetyBlockNote"
        :can-export-report="canExportReport"
        :exporting-report="exportingReport"
        :report-export-error="reportExportError"
        :report-export-success="reportExportSuccess"
        @export="handleExportReport"
      />

      <div v-if="rounds.length > 0" class="panel-card">
        <h3>会诊轮次</h3>
        <article v-for="round in rounds" :key="round.roundNumber" class="round-card">
          <strong>第 {{ round.roundNumber }} 轮</strong>
          <span class="round-meta">分歧指数 {{ round.dissentIndex.toFixed(3) }}</span>
          <ul>
            <li v-for="opinion in round.opinions" :key="`${round.roundNumber}-${opinion.agentId}`">
              {{ opinion.agentName }}（{{ opinion.riskLevel }}）：{{ opinion.reasoning }}
            </li>
          </ul>
        </article>
      </div>
    </section>

    <DemoModePanel
      :steps="demoMode.steps.value"
      :current-step-index="demoMode.currentStepIndex.value"
      :is-demo-mode="demoMode.isDemoMode.value"
      :is-paused="demoMode.isPaused.value"
      :auto-play="demoMode.autoPlay.value"
      :speed="demoMode.speed.value"
      @toggle-demo="toggleDemoMode"
      @toggle-pause="demoMode.togglePause()"
      @toggle-auto="demoMode.toggleAutoPlay()"
      @reset="demoMode.resetDemo()"
      @prev="demoMode.prevStep()"
      @next="demoMode.nextStep()"
      @go-to="demoMode.goToStep"
      @set-speed="demoMode.setSpeed"
      @exit="demoMode.exitDemo()"
    />
  </div>
</template>

<style scoped>
.split-layout {
  --ink: #132436;
  --muted: #51667c;
  --line: #cad6e2;
  --surface-left: #f8f4ea;
  --surface-right: #eff4f9;
  --card: #ffffff;
  --accent: #1f7b80;
  --danger: #c3472a;
  height: 100vh;
  display: flex;
  color: var(--ink);
  background:
    radial-gradient(circle at 0% 0%, #fff5d8 0%, transparent 45%),
    radial-gradient(circle at 100% 100%, #dcecf1 0%, transparent 40%),
    linear-gradient(140deg, #f4f6f9 0%, #edf3f7 100%);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
}

.right-pane {
  height: 100%;
  overflow-y: auto;
  padding: 18px;
  box-sizing: border-box;
}

.right-pane {
  flex: 1;
  background: linear-gradient(180deg, var(--surface-right) 0%, #f9fcff 100%);
}

.splitter {
  width: 10px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #dae3ed 0%, #c6d3e0 100%);
}

.splitter-grip {
  width: 3px;
  height: 60px;
  border-radius: 99px;
  background: #73889d;
}

.pane-header h2 {
  margin: 0;
  font-size: 22px;
}

.pane-header p {
  margin: 6px 0 14px;
  color: var(--muted);
  font-size: 13px;
}

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

.ghost-btn {
  border: 1px solid #9eb6cc;
  background: #f8fcff;
  color: #2f5878;
  border-radius: 8px;
  font-size: 12px;
  padding: 4px 9px;
  cursor: pointer;
}

.ghost-btn:hover {
  border-color: #79a1c2;
  background: #eef7ff;
}

.reasoning-map-chart {
  width: 100%;
  height: 300px;
  border: 1px solid #d7e1ec;
  border-radius: 10px;
  background:
    radial-gradient(circle at 0% 0%, rgba(234, 245, 255, 0.8), transparent 45%),
    radial-gradient(circle at 100% 100%, rgba(230, 250, 244, 0.7), transparent 45%),
    #fbfdff;
}

.map-caption {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.map-detail-card {
  margin-top: 10px;
  border: 1px solid #d3deea;
  border-radius: 9px;
  background: #f9fcff;
  padding: 10px;
}

.map-detail-card h4 {
  margin: 0 0 6px;
  font-size: 14px;
  color: #244764;
}

.map-detail-summary {
  margin: 0;
  font-size: 13px;
  color: #385a75;
  line-height: 1.5;
}

.map-detail-raw {
  margin: 8px 0 0;
  max-height: 120px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px dashed #c2d1e0;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  white-space: pre-wrap;
  line-height: 1.45;
  color: #32506a;
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

.stage-detail-card {
  margin-top: 12px;
  border: 1px solid #0e8d8f;
  border-radius: 8px;
  background: #eaf6f6;
  padding: 12px;
}

.stage-detail-card h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #0e8d8f;
}

.stage-detail-card p {
  margin: 4px 0;
  font-size: 13px;
  color: #385a75;
}

.status-line {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 13px;
}

.typewriter-output {
  margin: 0;
  min-height: 110px;
  max-height: 260px;
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: 1.6;
  background: #fbfeff;
  border: 1px dashed #c0d0df;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
}

.typing-caret {
  display: inline-block;
  margin-left: 2px;
  color: #0e8d8f;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%,
  45% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

.round-card {
  border: 1px solid #d3deea;
  border-radius: 8px;
  padding: 10px;
  margin-top: 8px;
  background: #fcfdff;
}

.round-meta {
  margin-left: 10px;
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 1100px) {
  .split-layout {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }

  .panel-head-row {
    align-items: flex-start;
  }

  .panel-head-actions {
    width: 100%;
    justify-content: space-between;
  }

  .right-pane {
    width: 100% !important;
    height: auto;
    max-height: none;
  }

  .splitter {
    width: 100%;
    height: 10px;
    cursor: row-resize;
  }

  .splitter-grip {
    width: 64px;
    height: 3px;
  }
}

/* 神经网络可视化卡片样式 */
.neural-network-card {
  padding: 0;
  overflow: hidden;
  border: none;
  background: transparent;
}

.neural-network-card :deep(.neural-network-container) {
  border-radius: 12px;
}
</style>







