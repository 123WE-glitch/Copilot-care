import { computed, type Ref } from 'vue';
import type {
  OrchestrationSnapshot,
  OrchestrationTask,
  TriageRoutingInfo,
  TriageStreamStageStatus,
  WorkflowStage,
} from '@copilot-care/shared/types';
import {
  ROUTE_MODE_TO_COLLABORATION,
  formatCollaboration,
  formatDepartment,
  formatRouteMode,
} from '../constants/triageLabels';

export type ConsultationUiStatus =
  | 'IDLE'
  | 'OUTPUT'
  | 'ESCALATE_TO_OFFLINE'
  | 'ABSTAIN'
  | 'ERROR';

interface StageRuntimeState {
  status: TriageStreamStageStatus;
  message: string;
}

interface RoutingPreviewState {
  routeMode?: string;
  department?: string;
  collaborationMode?: string;
  complexityScore?: number;
}

interface CurrentStageInfo {
  stage: WorkflowStage;
  label: string;
  status: TriageStreamStageStatus;
  message: string;
}

interface UseConsultationViewModelOptions {
  flowStages: WorkflowStage[];
  coreStages: WorkflowStage[];
  stageLabels: Record<WorkflowStage, string>;
  statusLabels: Record<ConsultationUiStatus, string>;
  snapshotPhaseLabels: Record<OrchestrationSnapshot['phase'], string>;
  status: Ref<ConsultationUiStatus>;
  stageRuntime: Ref<Record<WorkflowStage, StageRuntimeState>>;
  routeInfo: Ref<TriageRoutingInfo | null>;
  routingPreview: Ref<RoutingPreviewState>;
  resultNotes: Ref<string[]>;
  orchestrationSnapshot: Ref<OrchestrationSnapshot | null>;
}

const SAFETY_BLOCK_NOTE_PATTERN = /安全审校触发|阻断/i;

export function useConsultationViewModel(
  options: UseConsultationViewModelOptions,
) {
  const statusText = computed<string>(() => {
    return options.statusLabels[options.status.value];
  });

  const safetyBlockNote = computed<string>(() => {
    return (
      options.resultNotes.value.find((note) => SAFETY_BLOCK_NOTE_PATTERN.test(note))
      ?? ''
    );
  });

  const isSafetyBlocked = computed<boolean>(() => {
    return (
      options.status.value === 'ESCALATE_TO_OFFLINE'
      && safetyBlockNote.value.length > 0
    );
  });

  const coordinatorTasks = computed<OrchestrationTask[]>(() => {
    const source = options.orchestrationSnapshot.value?.tasks ?? [];
    const statusRank: Record<OrchestrationTask['status'], number> = {
      running: 0,
      pending: 1,
      blocked: 2,
      done: 3,
    };

    return [...source].sort((left, right) => {
      const rankGap = statusRank[left.status] - statusRank[right.status];
      if (rankGap !== 0) {
        return rankGap;
      }
      return right.progress - left.progress;
    });
  });

  const coordinatorSummary = computed<string>(() => {
    return options.orchestrationSnapshot.value?.summary
      ?? '等待总Agent分配任务...';
  });

  const coordinatorUpdatedAtText = computed<string>(() => {
    const generatedAt = options.orchestrationSnapshot.value?.generatedAt;
    if (!generatedAt) {
      return '--:--:--';
    }

    const date = new Date(generatedAt);
    if (Number.isNaN(date.getTime())) {
      return '--:--:--';
    }

    return date.toLocaleTimeString('zh-CN', { hour12: false });
  });

  const coordinatorPhaseText = computed<string>(() => {
    const phase = options.orchestrationSnapshot.value?.phase;
    if (!phase) {
      return '未启动';
    }

    return options.snapshotPhaseLabels[phase] ?? phase;
  });

  const coordinatorSourceText = computed<string>(() => {
    const source = options.orchestrationSnapshot.value?.source;
    if (!source) {
      return '规则';
    }
    return source === 'model' ? 'AI动态' : '规则';
  });

  const coordinatorActiveTaskHint = computed<string>(() => {
    const activeTask = coordinatorTasks.value.find(
      (item) => item.status === 'running',
    );
    if (activeTask) {
      const update = activeTask.latestUpdate?.trim();
      return `${activeTask.roleName}：${update || activeTask.objective}`;
    }
    if (coordinatorTasks.value.length > 0) {
      return '总Agent正在等待下一阶段触发。';
    }
    return '等待总Agent分配任务...';
  });

  const stageLegend = computed(() => {
    return options.flowStages.map((stage) => ({
      stage,
      label: options.stageLabels[stage],
      status: options.stageRuntime.value[stage].status,
      message: options.stageRuntime.value[stage].message,
    }));
  });

  const currentStageInfo = computed<CurrentStageInfo>(() => {
    const runningStage = options.flowStages.find((stage) => {
      return options.stageRuntime.value[stage].status === 'running';
    });

    if (runningStage) {
      return {
        stage: runningStage,
        label: options.stageLabels[runningStage],
        status: 'running',
        message: options.stageRuntime.value[runningStage].message,
      };
    }

    const completedStage = [...options.flowStages]
      .reverse()
      .find((stage) => options.stageRuntime.value[stage].status !== 'pending');

    if (!completedStage) {
      return {
        stage: 'START',
        label: options.stageLabels.START,
        status: 'pending',
        message: '等待任务启动',
      };
    }

    return {
      stage: completedStage,
      label: options.stageLabels[completedStage],
      status: options.stageRuntime.value[completedStage].status,
      message: options.stageRuntime.value[completedStage].message,
    };
  });

  const progressPercent = computed<number>(() => {
    const completedCount = options.coreStages.filter((stage) => {
      return options.stageRuntime.value[stage].status !== 'pending';
    }).length;

    return Math.round((completedCount / options.coreStages.length) * 100);
  });

  const pathDepartmentText = computed<string>(() => {
    if (options.routeInfo.value) {
      return formatDepartment(options.routeInfo.value.department);
    }
    if (options.routingPreview.value.department) {
      return formatDepartment(options.routingPreview.value.department);
    }
    if (options.stageRuntime.value.ROUTING.status === 'running') {
      return '正在判定首轮分诊科室...';
    }
    return '等待分诊结果';
  });

  const pathRouteModeText = computed<string>(() => {
    if (options.routeInfo.value) {
      return `${formatRouteMode(options.routeInfo.value.routeMode)}（复杂度 ${options.routeInfo.value.complexityScore}）`;
    }
    if (options.routingPreview.value.routeMode) {
      const complexity = typeof options.routingPreview.value.complexityScore === 'number'
        ? `（复杂度 ${options.routingPreview.value.complexityScore}）`
        : '';
      return `${formatRouteMode(options.routingPreview.value.routeMode)}${complexity}`;
    }
    if (options.stageRuntime.value.ROUTING.status !== 'pending') {
      return '正在计算复杂度分流策略...';
    }
    return '等待复杂度评估';
  });

  const pathCollaborationText = computed<string>(() => {
    if (options.routeInfo.value) {
      return formatCollaboration(options.routeInfo.value.collaborationMode);
    }
    if (options.routingPreview.value.collaborationMode) {
      return formatCollaboration(options.routingPreview.value.collaborationMode);
    }
    if (options.routingPreview.value.routeMode) {
      const inferred = ROUTE_MODE_TO_COLLABORATION[
        options.routingPreview.value.routeMode
      ];
      if (inferred) {
        return formatCollaboration(inferred);
      }
    }
    if (options.stageRuntime.value.DEBATE.status === 'running') {
      return '协同模式准备中...';
    }
    return '等待协同模式确定';
  });

  return {
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
  };
}
