import { ref, computed } from 'vue';
import type { OrchestrationSnapshot, ThinkStep } from '@copilot-care/shared/types';

export interface UseThinkChainStateOptions {
  onSnapshotUpdate?: (snapshot: OrchestrationSnapshot) => void;
}

export function useThinkChainState(options: UseThinkChainStateOptions = {}) {
  const currentSnapshot = ref<OrchestrationSnapshot | null>(null);
  const thinkSteps = ref<ThinkStep[]>([]);
  const isRunning = ref(false);
  const currentPhase = ref<string>('assignment');

  const hasSnapshot = computed(() => currentSnapshot.value !== null);

  const stepCount = computed(() => thinkSteps.value.length);

  const taskCount = computed(() => currentSnapshot.value?.tasks?.length || 0);

  const completedTaskCount = computed(() => 
    currentSnapshot.value?.tasks?.filter(t => t.status === 'done').length || 0
  );

  function updateSnapshot(snapshot: OrchestrationSnapshot) {
    currentSnapshot.value = snapshot;
    currentPhase.value = snapshot.phase;
    
    thinkSteps.value = buildThinkStepsFromSnapshot(snapshot);
    
    options.onSnapshotUpdate?.(snapshot);
  }

  function setRunning(running: boolean) {
    isRunning.value = running;
  }

  function reset() {
    currentSnapshot.value = null;
    thinkSteps.value = [];
    isRunning.value = false;
    currentPhase.value = 'assignment';
  }

  function buildThinkStepsFromSnapshot(snapshot: OrchestrationSnapshot): ThinkStep[] {
    const steps: ThinkStep[] = [];
    const tasks = snapshot.tasks || [];

    const coordinatorTask = tasks.find(t => t.roleId === 'chief_coordinator');
    if (coordinatorTask) {
      steps.push({
        stepId: 'step_intent',
        kind: 'intent_understanding',
        title: '理解需求',
        description: coordinatorTask.latestUpdate || '总Agent正在分析患者需求',
        status: coordinatorTask.status,
        progress: coordinatorTask.progress,
        timestamp: snapshot.generatedAt,
      });
    }

    const parentTask = tasks.find(t => t.subTasks && t.subTasks.length > 0);
    if (parentTask && parentTask.subTasks) {
      steps.push({
        stepId: 'step_decompose',
        kind: 'task_decomposition',
        title: '任务拆解',
        description: `拆解为 ${parentTask.subTasks.length} 个子任务`,
        status: parentTask.status,
        progress: parentTask.progress,
        timestamp: snapshot.generatedAt,
        subSteps: parentTask.subTasks.map((sub, idx) => ({
          stepId: `sub_${idx}`,
          kind: 'agent_dispatch' as const,
          title: sub.roleName,
          description: sub.objective,
          agentName: sub.roleName,
          provider: sub.provider,
          status: sub.status,
          progress: sub.progress,
          timestamp: snapshot.generatedAt,
        })),
      });
    }

    const executionTasks = tasks.filter(t => 
      t.roleId.includes('agent') || 
      t.roleId === 'specialist_panel' ||
      t.roleId === 'reviewer_agent'
    );

    if (executionTasks.length > 0) {
      const runningTasks = executionTasks.filter(t => t.status === 'running');
      const doneTasks = executionTasks.filter(t => t.status === 'done');

      steps.push({
        stepId: 'step_execute',
        kind: 'parallel_execution',
        title: '并行执行',
        description: `执行中: ${runningTasks.length}, 已完成: ${doneTasks.length}`,
        status: runningTasks.length > 0 ? 'running' : 'done',
        progress: Math.round(doneTasks.length / executionTasks.length * 100),
        timestamp: snapshot.generatedAt,
        subSteps: executionTasks.map(task => ({
          stepId: task.taskId,
          kind: 'agent_dispatch' as const,
          title: task.roleName,
          description: task.objective,
          agentName: task.roleName,
          provider: task.provider,
          status: task.status,
          progress: task.progress,
          timestamp: snapshot.generatedAt,
        })),
      });
    }

    const outputTask = tasks.find(t => t.roleId === 'output_agent');
    if (outputTask) {
      steps.push({
        stepId: 'step_aggregate',
        kind: 'result_aggregation',
        title: '结果汇总',
        description: outputTask.latestUpdate || '汇总各Agent意见',
        status: outputTask.status,
        progress: outputTask.progress,
        timestamp: snapshot.generatedAt,
      });
    }

    if (snapshot.summary) {
      steps.push({
        stepId: 'step_synthesize',
        kind: 'decision_synthesis',
        title: '决策合成',
        description: snapshot.summary,
        status: 'done',
        progress: 100,
        timestamp: snapshot.generatedAt,
      });
    }

    return steps;
  }

  return {
    currentSnapshot,
    thinkSteps,
    isRunning,
    currentPhase,
    hasSnapshot,
    stepCount,
    taskCount,
    completedTaskCount,
    updateSnapshot,
    setRunning,
    reset,
  };
}
