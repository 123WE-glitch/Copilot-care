export const ROUTE_MODE_LABELS: Record<string, string> = {
  FAST_CONSENSUS: '快速共识',
  LIGHT_DEBATE: '轻度辩论',
  DEEP_DEBATE: '深度辩论',
  ESCALATE_TO_OFFLINE: '线下上转',
};

export const DEPARTMENT_LABELS: Record<string, string> = {
  cardiology: '心血管专科',
  generalPractice: '全科',
  metabolic: '代谢专科',
  multiDisciplinary: '多学科',
};

export const COLLABORATION_LABELS: Record<string, string> = {
  SINGLE_SPECIALTY_PANEL: '同专业多模型协同',
  MULTI_DISCIPLINARY_CONSULT: '多学科协同会诊',
  OFFLINE_ESCALATION: '线下上转',
};

export const ROUTE_MODE_TO_COLLABORATION: Record<string, string> = {
  FAST_CONSENSUS: 'SINGLE_SPECIALTY_PANEL',
  LIGHT_DEBATE: 'SINGLE_SPECIALTY_PANEL',
  DEEP_DEBATE: 'MULTI_DISCIPLINARY_CONSULT',
  ESCALATE_TO_OFFLINE: 'OFFLINE_ESCALATION',
};

export function formatRouteMode(value: string): string {
  return ROUTE_MODE_LABELS[value] ?? value;
}

export function formatDepartment(value: string): string {
  return DEPARTMENT_LABELS[value] ?? value;
}

export function formatCollaboration(value: string): string {
  return COLLABORATION_LABELS[value] ?? value;
}
