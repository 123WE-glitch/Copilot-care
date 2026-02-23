import type { MCPPatientResponse } from '../../services/api';

export interface PatientVitalsRecord {
  timestamp: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  bloodGlucose?: number;
}

export type ConsultationStatus =
  | 'OUTPUT'
  | 'ESCALATE_TO_OFFLINE'
  | 'ABSTAIN'
  | 'ERROR';

export interface ConsultationRecord {
  id: string;
  date: string;
  conclusion: string;
  department: string;
  status: ConsultationStatus;
  triageLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PatientDashboardData {
  patient: MCPPatientResponse;
  insights: string[];
  vitals: PatientVitalsRecord[];
  consultationHistory: ConsultationRecord[];
}

export const SEX_LABELS: Record<string, string> = {
  male: '男',
  female: '女',
  other: '其他',
};

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  OUTPUT: '已完成',
  ESCALATE_TO_OFFLINE: '线下转诊',
  ABSTAIN: '待补充数据',
  ERROR: '执行异常',
};

export const CONSULTATION_STATUS_COLORS: Record<ConsultationStatus, string> = {
  OUTPUT: '#209067',
  ESCALATE_TO_OFFLINE: '#cf912f',
  ABSTAIN: '#70879a',
  ERROR: '#d05738',
};

export const TRIAGE_LEVEL_LABELS: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '极高风险',
};
