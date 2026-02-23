import type { OrchestrationSnapshot, WorkflowStage } from '@copilot-care/shared/types';
import type { ConsultationReasoningKind } from '../composables/useConsultationCharts';

export type ConsultationViewUiStatus =
  | 'IDLE'
  | 'OUTPUT'
  | 'ESCALATE_TO_OFFLINE'
  | 'ABSTAIN'
  | 'ERROR';

export const CONSULTATION_STAGE_LABELS: Record<WorkflowStage, string> = {
  START: '启动',
  INFO_GATHER: '信息采集',
  RISK_ASSESS: '风险评估',
  ROUTING: '复杂度分流',
  DEBATE: '协同讨论',
  CONSENSUS: '共识收敛',
  REVIEW: '审校复核',
  OUTPUT: '输出结论',
  ESCALATION: '线下上转',
};

export const CONSULTATION_STATUS_LABELS: Record<ConsultationViewUiStatus, string> = {
  IDLE: '待会诊',
  OUTPUT: '会诊完成',
  ESCALATE_TO_OFFLINE: '建议线下上转',
  ABSTAIN: '暂缓结论',
  ERROR: '会诊异常',
};

export const CONSULTATION_REQUIRED_FIELD_LABELS: Record<string, string> = {
  symptomText: '症状/主诉描述',
  systolicBP: '收缩压',
  diastolicBP: '舒张压',
  chronicDiseasesOrMedicationHistory: '慢病史或用药史',
  ageOrSex: '年龄或性别',
  consentToken: '授权 token',
};

export const CONSULTATION_REASONING_KIND_LABELS: Record<ConsultationReasoningKind, string> =
  {
    system: '系统',
    evidence: '证据',
    decision: '决策',
    warning: '风险',
    query: '补充',
  };

export const CONSULTATION_SNAPSHOT_PHASE_LABELS: Record<
  OrchestrationSnapshot['phase'],
  string
> = {
  assignment: '任务拆分',
  analysis: '证据分析',
  execution: '协同执行',
  synthesis: '汇总结论',
  complete: '最终汇报',
};
