import { watch, type Ref } from 'vue';
import type { WorkflowStage } from '@copilot-care/shared/types';

interface StageRuntimeState {
  status: string;
  message: string;
}

interface UseConsultationViewSyncOptions {
  stageRuntime: Ref<Record<WorkflowStage, StageRuntimeState>>;
  reasoningItems: Ref<unknown[]>;
  routeInfo: Ref<unknown>;
  routingPreview: Ref<unknown>;
  status: Ref<unknown>;
  typedOutput: Ref<string>;
  explainableReport: Ref<unknown>;
  orchestrationSnapshot: Ref<unknown>;
  requiredFields: Ref<string[]>;
  renderFlowChart?: () => void;
  renderReasoningMap: () => void;
  setAdvancedInputsVisible: (visible: boolean) => void;
}

interface UseConsultationViewSyncState {
  stopSync: () => void;
}

const ADVANCED_REQUIRED_FIELDS: readonly string[] = [
  'systolicBP',
  'diastolicBP',
  'chronicDiseasesOrMedicationHistory',
  'consentToken',
];

export function useConsultationViewSync(
  options: UseConsultationViewSyncOptions,
): UseConsultationViewSyncState {
  const stopStageRuntimeWatch = watch(
    options.stageRuntime,
    () => {
      options.renderFlowChart?.();
      options.renderReasoningMap();
    },
    { deep: true },
  );

  const stopReasoningWatch = watch(
    [
      options.reasoningItems,
      options.routeInfo,
      options.routingPreview,
      options.status,
      options.typedOutput,
      options.explainableReport,
      options.orchestrationSnapshot,
    ],
    () => {
      options.renderReasoningMap();
    },
    { deep: true },
  );

  const stopRequiredFieldsWatch = watch(options.requiredFields, (fields) => {
    if (
      fields.some((field) =>
        ADVANCED_REQUIRED_FIELDS.includes(field),
      )
    ) {
      options.setAdvancedInputsVisible(true);
    }
  });

  function stopSync(): void {
    stopStageRuntimeWatch();
    stopReasoningWatch();
    stopRequiredFieldsWatch();
  }

  return {
    stopSync,
  };
}
