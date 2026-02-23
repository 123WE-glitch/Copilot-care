import {
  DebateResult,
  WorkflowStageTrace,
  TriageRequest,
} from '@copilot-care/shared/types';

export interface OrchestratorRunOptions {
  onWorkflowStage?: (stage: WorkflowStageTrace) => void;
  onReasoningStep?: (message: string) => void;
}

export interface TriageOrchestratorPort {
  runSession(
    input: TriageRequest,
    options?: OrchestratorRunOptions,
  ): Promise<DebateResult>;
}
