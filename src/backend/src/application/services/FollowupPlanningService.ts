import {
  RiskLevel,
  StructuredTriageResult,
  TriageDepartment,
  TriageLevel,
} from '@copilot-care/shared/types';

export interface FollowupPlanningInput {
  patientId: string;
  riskLevel: RiskLevel;
  triageLevel: TriageLevel;
  department: TriageDepartment;
}

const DEPARTMENT_DESTINATION: Record<TriageDepartment, string> = {
  cardiology: 'cardiology_outpatient',
  generalPractice: 'gp_clinic',
  metabolic: 'metabolic_outpatient',
  multiDisciplinary: 'multidisciplinary_clinic',
};

function defaultEducationAdvice(riskLevel: RiskLevel): string[] {
  if (riskLevel === 'L3') {
    return ['立即线下就医', '保持静息并避免独自外出', '携带既往检查结果快速就诊'];
  }
  if (riskLevel === 'L2') {
    return ['每日早晚监测血压', '控制盐摄入并规律作息', '两周内完成专科复评'];
  }
  if (riskLevel === 'L1') {
    return ['每周记录体征趋势', '坚持饮食与运动管理', '按计划复诊并回传记录'];
  }
  return ['维持健康生活方式', '按周期复评', '出现异常及时复诊'];
}

export class FollowupPlanningService {
  public buildPlan(input: FollowupPlanningInput): StructuredTriageResult {
    let followupDays = 90;
    if (input.triageLevel === 'emergency') {
      followupDays = 1;
    } else if (input.triageLevel === 'urgent') {
      followupDays = 14;
    } else if (input.triageLevel === 'routine') {
      followupDays = 30;
    }

    return {
      patientId: input.patientId,
      triageLevel: input.triageLevel,
      destination:
        input.triageLevel === 'emergency'
          ? 'offline_emergency'
          : DEPARTMENT_DESTINATION[input.department],
      followupDays,
      educationAdvice: defaultEducationAdvice(input.riskLevel),
      tcmAdvice:
        input.riskLevel === 'L0' || input.riskLevel === 'L1'
          ? ['可结合中医体质调理，作为长期管理增强建议']
          : undefined,
    };
  }
}
