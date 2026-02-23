import {
  HealthSignal,
  PatientProfile,
  TriageRequest,
} from '@copilot-care/shared/types';

export interface IntakeAssessment {
  ok: boolean;
  normalizedProfile: PatientProfile;
  requiredFields: string[];
  notes: string[];
}

function parseSymptoms(symptomText: string | undefined): string[] {
  if (!symptomText) {
    return [];
  }
  return symptomText
    .split(/[,，、;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickLatestSignal(signals: HealthSignal[] | undefined): HealthSignal | null {
  if (!signals || signals.length === 0) {
    return null;
  }

  const sorted = [...signals].sort((a, b) => {
    const left = Date.parse(a.timestamp || '');
    const right = Date.parse(b.timestamp || '');
    if (!Number.isFinite(left) && !Number.isFinite(right)) {
      return 0;
    }
    if (!Number.isFinite(left)) {
      return -1;
    }
    if (!Number.isFinite(right)) {
      return 1;
    }
    return left - right;
  });
  return sorted[sorted.length - 1] ?? null;
}

function normalizeProfile(input: TriageRequest): PatientProfile {
  const latestSignal = pickLatestSignal(input.signals);
  const symptomText = input.symptomText?.trim();
  const symptomsFromText = parseSymptoms(symptomText);
  const profileSymptoms = input.profile.symptoms ?? [];
  const mergedSymptoms = [
    ...new Set(
      [...profileSymptoms, ...symptomsFromText]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];

  const mergedVitals = {
    systolicBP:
      input.profile.vitals?.systolicBP ?? latestSignal?.systolicBP,
    diastolicBP:
      input.profile.vitals?.diastolicBP ?? latestSignal?.diastolicBP,
    heartRate: input.profile.vitals?.heartRate ?? latestSignal?.heartRate,
    spo2: input.profile.vitals?.spo2 ?? latestSignal?.spo2,
    bloodGlucose:
      input.profile.vitals?.bloodGlucose ?? latestSignal?.bloodGlucose,
    bloodLipid: input.profile.vitals?.bloodLipid ?? latestSignal?.bloodLipid,
  };

  const hasAnyVitalValue = Object.values(mergedVitals).some(
    (value) => typeof value === 'number' && Number.isFinite(value),
  );

  return {
    ...input.profile,
    chiefComplaint:
      input.profile.chiefComplaint?.trim() ||
      symptomText ||
      input.profile.chiefComplaint,
    symptoms: mergedSymptoms,
    chronicDiseases: input.profile.chronicDiseases ?? [],
    medicationHistory: input.profile.medicationHistory ?? [],
    allergyHistory: input.profile.allergyHistory ?? [],
    lifestyleTags: input.profile.lifestyleTags ?? [],
    vitals: hasAnyVitalValue ? mergedVitals : input.profile.vitals,
  };
}

export class MinimumInfoSetService {
  public assess(input: TriageRequest): IntakeAssessment {
    const normalizedProfile = normalizeProfile(input);
    const requiredFields: string[] = [];
    const notes: string[] = [];

    const hasComplaintOrSymptoms =
      Boolean(normalizedProfile.chiefComplaint?.trim()) ||
      (normalizedProfile.symptoms?.length ?? 0) > 0;
    if (!hasComplaintOrSymptoms) {
      requiredFields.push('symptomText');
      notes.push('缺少主诉或症状描述。');
    }

    const hasSbp = Number.isFinite(normalizedProfile.vitals?.systolicBP);
    const hasDbp = Number.isFinite(normalizedProfile.vitals?.diastolicBP);
    if (!hasSbp) {
      requiredFields.push('systolicBP');
      notes.push('缺少收缩压数据。');
    }
    if (!hasDbp) {
      requiredFields.push('diastolicBP');
      notes.push('缺少舒张压数据。');
    }

    const hasHistory =
      (normalizedProfile.chronicDiseases?.length ?? 0) > 0 ||
      (normalizedProfile.medicationHistory?.length ?? 0) > 0;
    if (!hasHistory) {
      requiredFields.push('chronicDiseasesOrMedicationHistory');
      notes.push('缺少关键病史或用药史。');
    }

    const hasBasicIdentity =
      normalizedProfile.age > 0 &&
      ['male', 'female', 'other'].includes(normalizedProfile.sex);
    if (!hasBasicIdentity) {
      requiredFields.push('ageOrSex');
      notes.push('年龄或性别信息无效。');
    }

    return {
      ok: requiredFields.length === 0,
      normalizedProfile,
      requiredFields,
      notes,
    };
  }
}
