import {
  PatientProfile,
  TriageCollaborationMode,
  TriageDepartment,
  TriageRouteMode,
  TriageRoutingInfo,
} from '@copilot-care/shared/types';

export interface ComplexityScoreResult {
  score: number;
  reasons: string[];
}

export interface RoutingDecision extends TriageRoutingInfo {}

interface DepartmentTriageDecision {
  department: TriageDepartment;
  reasons: string[];
  cardioSignalScore: number;
  metabolicSignalScore: number;
}

const DEPARTMENT_LABELS: Record<TriageDepartment, string> = {
  cardiology: '心血管',
  generalPractice: '全科',
  metabolic: '代谢',
  multiDisciplinary: '多学科',
};

const RED_FLAG_TERMS = [
  'chest pain',
  'shortness of breath',
  'syncope',
  'severe headache',
  '胸痛',
  '呼吸困难',
  '晕厥',
  '剧烈头痛',
];

const CARDIO_DISEASE_TERMS = [
  'hypertension',
  'high blood pressure',
  'coronary',
  'arrhythmia',
  'heart failure',
  '高血压',
  '冠心病',
  '心律失常',
  '心衰',
];

const METABOLIC_DISEASE_TERMS = [
  'diabetes',
  'prediabetes',
  'dyslipidemia',
  'hyperlipidemia',
  'obesity',
  'metabolic syndrome',
  '糖尿病',
  '糖耐量异常',
  '血脂异常',
  '高脂血症',
  '肥胖',
];

const CARDIO_SYMPTOM_TERMS = [
  'chest',
  'palpitation',
  'dyspnea',
  'edema',
  '胸闷',
  '胸痛',
  '心悸',
  '气促',
];

const METABOLIC_SYMPTOM_TERMS = [
  'thirst',
  'polyuria',
  'polyphagia',
  'fatigue',
  'weight loss',
  '口渴',
  '多尿',
  '乏力',
  '体重下降',
];

const CROSS_SYSTEM_TERMS = [
  'headache',
  'dizziness',
  'shortness of breath',
  '头痛',
  '头晕',
  '呼吸困难',
];

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function hasRedFlag(profile: PatientProfile): boolean {
  const symptoms = profile.symptoms ?? [];
  const symptomFlag = symptoms.some((item) => hasAnyKeyword(item, RED_FLAG_TERMS));
  const bpFlag =
    (profile.vitals?.systolicBP ?? 0) >= 180 ||
    (profile.vitals?.diastolicBP ?? 0) >= 110;
  return symptomFlag || bpFlag;
}

function hasRiskBoundarySignal(profile: PatientProfile): boolean {
  if (hasRedFlag(profile)) {
    return true;
  }
  const moderateHighBp =
    (profile.vitals?.systolicBP ?? 0) >= 160 ||
    (profile.vitals?.diastolicBP ?? 0) >= 100;
  return moderateHighBp;
}

function isCoreInformationMissing(profile: PatientProfile): boolean {
  const hasComplaint =
    typeof profile.chiefComplaint === 'string' &&
    profile.chiefComplaint.trim().length > 0;
  const hasSymptom = Array.isArray(profile.symptoms) && profile.symptoms.length > 0;
  const hasBloodPressure =
    Number.isFinite(profile.vitals?.systolicBP) &&
    Number.isFinite(profile.vitals?.diastolicBP);
  const hasHistory =
    (Array.isArray(profile.chronicDiseases) && profile.chronicDiseases.length > 0) ||
    (Array.isArray(profile.medicationHistory) && profile.medicationHistory.length > 0);

  return !(hasBloodPressure && hasHistory && (hasComplaint || hasSymptom));
}

function detectSymptomSystems(symptoms: string[]): number {
  let cardio = 0;
  let metabolic = 0;
  let crossSystem = 0;

  for (const symptom of symptoms) {
    if (hasAnyKeyword(symptom, CARDIO_SYMPTOM_TERMS)) {
      cardio += 1;
    }
    if (hasAnyKeyword(symptom, METABOLIC_SYMPTOM_TERMS)) {
      metabolic += 1;
    }
    if (hasAnyKeyword(symptom, CROSS_SYSTEM_TERMS)) {
      crossSystem += 1;
    }
  }

  return [cardio, metabolic, crossSystem].filter((count) => count > 0).length;
}

function hasHistoryWorseningSignal(profile: PatientProfile): boolean {
  const textParts = [profile.chiefComplaint ?? '', ...(profile.symptoms ?? [])];
  const text = textParts.join(' ').toLowerCase();
  return /worsen|persistent|recurrent|加重|持续|反复/.test(text);
}

function detectDepartment(profile: PatientProfile): DepartmentTriageDecision {
  const diseases = profile.chronicDiseases ?? [];
  const symptoms = profile.symptoms ?? [];
  let cardioSignalScore = 0;
  let metabolicSignalScore = 0;

  for (const disease of diseases) {
    if (hasAnyKeyword(disease, CARDIO_DISEASE_TERMS)) {
      cardioSignalScore += 2;
    }
    if (hasAnyKeyword(disease, METABOLIC_DISEASE_TERMS)) {
      metabolicSignalScore += 2;
    }
  }

  for (const symptom of symptoms) {
    if (hasAnyKeyword(symptom, CARDIO_SYMPTOM_TERMS)) {
      cardioSignalScore += 1;
    }
    if (hasAnyKeyword(symptom, METABOLIC_SYMPTOM_TERMS)) {
      metabolicSignalScore += 1;
    }
  }

  if ((profile.vitals?.systolicBP ?? 0) >= 140 || (profile.vitals?.diastolicBP ?? 0) >= 90) {
    cardioSignalScore += 1;
  }

  if (cardioSignalScore === 0 && metabolicSignalScore === 0) {
    return {
      department: 'generalPractice',
      reasons: ['缺少清晰专科信号，先由全科进行首轮分诊。'],
      cardioSignalScore,
      metabolicSignalScore,
    };
  }

  if (Math.abs(cardioSignalScore - metabolicSignalScore) <= 1) {
    return {
      department: 'generalPractice',
      reasons: ['心血管与代谢信号接近，先由全科进行同专业面板评估。'],
      cardioSignalScore,
      metabolicSignalScore,
    };
  }

  if (metabolicSignalScore > cardioSignalScore) {
    return {
      department: 'metabolic',
      reasons: ['代谢相关信号占优，进入代谢专科协同评估。'],
      cardioSignalScore,
      metabolicSignalScore,
    };
  }

  return {
    department: 'cardiology',
    reasons: ['心血管相关信号占优，进入心血管专科协同评估。'],
    cardioSignalScore,
    metabolicSignalScore,
  };
}

function resolveModeByComplexity(
  score: number,
  forceAtLeastLightDebate: boolean,
): TriageRouteMode {
  if (score <= 2) {
    return forceAtLeastLightDebate ? 'LIGHT_DEBATE' : 'FAST_CONSENSUS';
  }
  if (score <= 5) {
    return 'LIGHT_DEBATE';
  }
  return 'DEEP_DEBATE';
}

function resolveCollaborationMode(
  mode: TriageRouteMode,
): TriageCollaborationMode {
  if (mode === 'DEEP_DEBATE') {
    return 'MULTI_DISCIPLINARY_CONSULT';
  }
  if (mode === 'ESCALATE_TO_OFFLINE') {
    return 'OFFLINE_ESCALATION';
  }
  return 'SINGLE_SPECIALTY_PANEL';
}

export function evaluateComplexityScore(
  profile: PatientProfile,
): ComplexityScoreResult {
  const reasons: string[] = [];
  let score = 0;

  if (isCoreInformationMissing(profile)) {
    score += 2;
    reasons.push('核心信息存在缺口（主诉/血压/病史不完整）(+2)');
  }

  const symptomCount = (profile.symptoms ?? []).length;
  const crossSystems = detectSymptomSystems(profile.symptoms ?? []);
  if (symptomCount >= 3 && crossSystems >= 2) {
    score += 2;
    reasons.push('症状数量>=3 且跨系统 (+2)');
  }

  if ((profile.chronicDiseases ?? []).length >= 2) {
    score += 2;
    reasons.push('慢病共病负担>=2 (+2)');
  }

  if (hasRiskBoundarySignal(profile)) {
    score += 3;
    reasons.push('触发风险边界信号（红旗或中高危阈值）(+3)');
  }

  if (hasHistoryWorseningSignal(profile)) {
    score += 1;
    reasons.push('存在趋势恶化信号 (+1)');
  }

  return { score, reasons };
}

export function decideRouting(profile: PatientProfile): RoutingDecision {
  const complexity = evaluateComplexityScore(profile);
  const missingCoreInfo = isCoreInformationMissing(profile);

  if (hasRedFlag(profile)) {
    return {
      complexityScore: complexity.score,
      routeMode: 'ESCALATE_TO_OFFLINE',
      department: 'multiDisciplinary',
      collaborationMode: 'OFFLINE_ESCALATION',
      reasons: ['红旗边界优先触发，直接线下上转。', ...complexity.reasons],
    };
  }

  const triageDepartment = detectDepartment(profile);
  const routeMode = resolveModeByComplexity(complexity.score, missingCoreInfo);
  const department =
    routeMode === 'DEEP_DEBATE' ? 'multiDisciplinary' : triageDepartment.department;

  const reasons = [
    `首轮分诊：${DEPARTMENT_LABELS[triageDepartment.department]}（心血管信号=${triageDepartment.cardioSignalScore}，代谢信号=${triageDepartment.metabolicSignalScore}）`,
    ...triageDepartment.reasons,
    ...complexity.reasons,
  ];

  if (missingCoreInfo) {
    reasons.push('最小信息集未补齐，禁止快速共识，至少进入轻度辩论。');
  }
  if (routeMode === 'DEEP_DEBATE') {
    reasons.push('复杂度达到深度会诊阈值，切换多学科协同。');
  }

  return {
    complexityScore: complexity.score,
    routeMode,
    department,
    collaborationMode: resolveCollaborationMode(routeMode),
    reasons,
  };
}
