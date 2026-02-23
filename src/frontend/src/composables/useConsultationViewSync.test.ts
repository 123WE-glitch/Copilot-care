import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { WorkflowStage } from '@copilot-care/shared/types';
import { useConsultationViewSync } from './useConsultationViewSync';

interface RuntimeState {
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped' | 'blocked';
  message: string;
}

function createStageRuntime(): Record<WorkflowStage, RuntimeState> {
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

function createSyncContext() {
  const renderFlowChart = vi.fn();
  const renderReasoningMap = vi.fn();
  const setAdvancedInputsVisible = vi.fn();

  const stageRuntime = ref(createStageRuntime());
  const reasoningItems = ref<unknown[]>([]);
  const routeInfo = ref<unknown>(null);
  const routingPreview = ref<unknown>({});
  const status = ref<unknown>('IDLE');
  const typedOutput = ref<string>('');
  const explainableReport = ref<unknown>(null);
  const orchestrationSnapshot = ref<unknown>(null);
  const requiredFields = ref<string[]>([]);

  const state = useConsultationViewSync({
    stageRuntime,
    reasoningItems,
    routeInfo,
    routingPreview,
    status,
    typedOutput,
    explainableReport,
    orchestrationSnapshot,
    requiredFields,
    renderFlowChart,
    renderReasoningMap,
    setAdvancedInputsVisible,
  });

  return {
    state,
    stageRuntime,
    reasoningItems,
    typedOutput,
    requiredFields,
    renderFlowChart,
    renderReasoningMap,
    setAdvancedInputsVisible,
  };
}

describe('useConsultationViewSync', () => {
  it('re-renders flow and reasoning map when stage runtime changes', async () => {
    const context = createSyncContext();

    context.stageRuntime.value.ROUTING.status = 'running';
    context.stageRuntime.value.ROUTING.message = '分流中';
    await nextTick();

    expect(context.renderFlowChart).toHaveBeenCalledTimes(1);
    expect(context.renderReasoningMap).toHaveBeenCalledTimes(1);
  });

  it('re-renders reasoning map when reasoning dependencies change', async () => {
    const context = createSyncContext();

    context.reasoningItems.value = [{ kind: 'evidence', text: 'bp 148/95' }];
    await nextTick();

    context.typedOutput.value = '建议门诊复查';
    await nextTick();

    expect(context.renderFlowChart).not.toHaveBeenCalled();
    expect(context.renderReasoningMap).toHaveBeenCalledTimes(2);
  });

  it('expands advanced inputs only when required fields include advanced keys', async () => {
    const context = createSyncContext();

    context.requiredFields.value = ['symptomText'];
    await nextTick();
    expect(context.setAdvancedInputsVisible).not.toHaveBeenCalled();

    context.requiredFields.value = ['consentToken'];
    await nextTick();
    expect(context.setAdvancedInputsVisible).toHaveBeenCalledTimes(1);
    expect(context.setAdvancedInputsVisible).toHaveBeenCalledWith(true);
  });

  it('stops all watchers after stopSync', async () => {
    const context = createSyncContext();
    context.state.stopSync();

    context.stageRuntime.value.ROUTING.status = 'running';
    context.reasoningItems.value = [{ kind: 'system', text: 'test' }];
    context.requiredFields.value = ['consentToken'];
    await nextTick();

    expect(context.renderFlowChart).not.toHaveBeenCalled();
    expect(context.renderReasoningMap).not.toHaveBeenCalled();
    expect(context.setAdvancedInputsVisible).not.toHaveBeenCalled();
  });
});
