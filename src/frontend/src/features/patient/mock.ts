import type { MCPPatientResponse } from '../../services/api';
import type {
  ConsultationRecord,
  PatientDashboardData,
  PatientVitalsRecord,
} from './model';

const DEPARTMENTS: string[] = [
  '心血管科',
  '全科门诊',
  '代谢专科',
  '多学科会诊',
];

const CONSULTATION_STATUSES: ConsultationRecord['status'][] = [
  'OUTPUT',
  'OUTPUT',
  'OUTPUT',
  'ESCALATE_TO_OFFLINE',
  'ABSTAIN',
];

const TRIAGE_LEVELS: NonNullable<ConsultationRecord['triageLevel']>[] = [
  'low',
  'medium',
  'high',
  'critical',
];

export function createMockPatient(patientId: string): MCPPatientResponse {
  return {
    patientId,
    name: '演示患者',
    age: 56,
    sex: 'male',
    chiefComplaint: '头痛伴血压升高，偶发胸闷。',
    chronicDiseases: ['高血压', '2 型糖尿病'],
    medicationHistory: ['氨氯地平', '二甲双胍'],
    lifestyleTags: ['久坐', '高盐饮食'],
    tcmConstitution: '气虚体质',
  };
}

export function createMockInsights(): string[] {
  return [
    '血压波动幅度高于基础目标区间。',
    '血糖趋势总体稳定，但仍接近干预阈值。',
    '建议低盐饮食并维持每周规律运动随访。',
  ];
}

export function createMockVitals(
  totalDays: number = 30,
  stepDays: number = 5,
): PatientVitalsRecord[] {
  const now = Date.now();
  const records: PatientVitalsRecord[] = [];

  for (let dayOffset = totalDays; dayOffset >= 0; dayOffset -= stepDays) {
    const index = (totalDays - dayOffset) / stepDays;
    const timestamp = new Date(
      now - dayOffset * 24 * 60 * 60 * 1000,
    ).toISOString();

    records.push({
      timestamp,
      systolicBP: 122 + (index % 4) * 4 + (index % 2 === 0 ? 3 : -2),
      diastolicBP: 76 + (index % 3) * 3 + (index % 2 === 0 ? 1 : -1),
      heartRate: 66 + (index % 5) * 2,
      bloodGlucose: Number((5.7 + (index % 4) * 0.35).toFixed(1)),
    });
  }

  return records;
}

export function createMockConsultationHistory(
  count: number = 5,
): ConsultationRecord[] {
  const now = Date.now();
  const records: ConsultationRecord[] = [];

  for (let index = 0; index < count; index += 1) {
    records.push({
      id: `consultation-${index + 1}`,
      date: new Date(now - (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      conclusion:
        index % 2 === 0
          ? '建议维持当前用药并按周监测生命体征。'
          : '建议专科复核风险分层并制定下一步处置方案。',
      department: DEPARTMENTS[index % DEPARTMENTS.length],
      status: CONSULTATION_STATUSES[index % CONSULTATION_STATUSES.length],
      triageLevel: TRIAGE_LEVELS[index % TRIAGE_LEVELS.length],
    });
  }

  return records;
}

export function createMockPatientDashboard(
  patientId: string = 'demo-001',
): PatientDashboardData {
  return {
    patient: createMockPatient(patientId),
    insights: createMockInsights(),
    vitals: createMockVitals(),
    consultationHistory: createMockConsultationHistory(),
  };
}
