import { RequestValidationError } from '../errors/RequestValidationError';
import {
  HealthSignal,
  PatientProfile,
  RiskLevel,
  TriageLevel,
} from '@copilot-care/shared/types';

export interface RiskAssessmentSnapshot {
  riskLevel: RiskLevel;
  triageLevel: TriageLevel;
  redFlagTriggered: boolean;
  evidence: string[];
  guidelineBasis: string[];
}

const RED_FLAG_TERMS = [
  'chest pain',
  'shortness of breath',
  'syncope',
  'severe headache',
  'neurological deficit',
  'hurt myself',
  'suicide',
  'kill myself',
  'die',
  '胸痛',
  '呼吸困难',
  '晕厥',
  '剧烈头痛',
  '神经功能缺损',
];

function hasRedFlagBySymptoms(profile: PatientProfile): boolean {
  const symptoms = profile.symptoms ?? [];
  return symptoms.some((symptom) => {
    const normalized = symptom.toLowerCase();
    return RED_FLAG_TERMS.some((term) => normalized.includes(term.toLowerCase()));
  });
}

function hasRedFlagBySignals(signals: HealthSignal[]): boolean {
  return signals.some((signal) => {
    return (signal.systolicBP ?? 0) >= 180 || (signal.diastolicBP ?? 0) >= 110;
  });
}

function mapRiskToTriageLevel(riskLevel: RiskLevel): TriageLevel {
  if (riskLevel === 'L3') {
    return 'emergency';
  }
  if (riskLevel === 'L2') {
    return 'urgent';
  }
  if (riskLevel === 'L1') {
    return 'routine';
  }
  return 'followup';
}

export class RuleFirstRiskAssessmentService {
  public evaluate(
    profile: PatientProfile,
    signals: HealthSignal[] = [],
  ): RiskAssessmentSnapshot {
    const evidence: string[] = [];
    const guidelineBasis: string[] = [
      '高血压分级与风险分层规则（第5章模块B）',
      '红旗短路优先原则（第3章与第4章）',
    ];

    const systolic =
      profile.vitals?.systolicBP ??
      [...signals]
        .reverse()
        .find((signal) => Number.isFinite(signal.systolicBP))
        ?.systolicBP;
    const diastolic =
      profile.vitals?.diastolicBP ??
      [...signals]
        .reverse()
        .find((signal) => Number.isFinite(signal.diastolicBP))
        ?.diastolicBP;

    if (
      Number.isFinite(systolic) &&
      Number.isFinite(diastolic) &&
      (systolic ?? 0) < (diastolic ?? 0)
    ) {
      throw new RequestValidationError(
        'ERR_INVALID_VITAL_SIGN',
        '收缩压不能低于舒张压。',
      );
    }

    const redFlagTriggered =
      hasRedFlagBySymptoms(profile) ||
      hasRedFlagBySignals(signals) ||
      (systolic ?? 0) >= 180 ||
      (diastolic ?? 0) >= 110;

    if (redFlagTriggered) {
      evidence.push('触发红旗症状或危急血压阈值。');
      return {
        riskLevel: 'L3',
        triageLevel: 'emergency',
        redFlagTriggered: true,
        evidence,
        guidelineBasis,
      };
    }

    const hasMultiComorbidity = (profile.chronicDiseases ?? []).length >= 2;
    const hasPersistentSymptoms = (profile.symptoms ?? []).length >= 3;

    if ((systolic ?? 0) >= 160 || (diastolic ?? 0) >= 100 || hasMultiComorbidity) {
      evidence.push('血压达到中高风险区间或存在多病共存。');
      return {
        riskLevel: 'L2',
        triageLevel: mapRiskToTriageLevel('L2'),
        redFlagTriggered: false,
        evidence,
        guidelineBasis,
      };
    }

    if ((systolic ?? 0) >= 140 || (diastolic ?? 0) >= 90 || hasPersistentSymptoms) {
      evidence.push('血压轻中度升高或症状持续。');
      return {
        riskLevel: 'L1',
        triageLevel: mapRiskToTriageLevel('L1'),
        redFlagTriggered: false,
        evidence,
        guidelineBasis,
      };
    }

    evidence.push('未见明确高风险边界信号，进入常规管理路径。');
    return {
      riskLevel: 'L0',
      triageLevel: mapRiskToTriageLevel('L0'),
      redFlagTriggered: false,
      evidence,
      guidelineBasis,
    };
  }
}
