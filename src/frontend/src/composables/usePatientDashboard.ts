import { computed, ref } from 'vue';
import {
  createPatientDashboardRepository,
  type PatientDashboardRepository,
} from '../features/patient/repository';
import type { MCPPatientResponse } from '../services/api';
import type {
  ConsultationRecord,
  PatientVitalsRecord,
} from '../features/patient/model';

const SYSTOLIC_TOKENS: string[] = ['systolic', '8480-6'];
const DIASTOLIC_TOKENS: string[] = ['diastolic', '8462-4'];
const HEART_RATE_TOKENS: string[] = ['heart rate', 'pulse', '8867-4'];
const GLUCOSE_TOKENS: string[] = ['glucose', '2339-0', 'blood sugar'];

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function includesAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

interface ObservationLike {
  code?: {
    text?: string;
    coding?: Array<{ code?: string; display?: string }>;
  };
  effectiveDateTime?: string;
  valueQuantity?: { value?: number };
}

function extractObservationCode(observation: ObservationLike): string {
  const tokens: string[] = [];

  if (observation.code?.text) {
    tokens.push(observation.code.text);
  }

  for (const coding of observation.code?.coding ?? []) {
    if (coding.code) {
      tokens.push(coding.code);
    }
    if (coding.display) {
      tokens.push(coding.display);
    }
  }

  return normalizeText(tokens.join(' '));
}

function upsertRecord(
  recordsByTimestamp: Map<string, PatientVitalsRecord>,
  timestamp: string,
): PatientVitalsRecord {
  const current = recordsByTimestamp.get(timestamp);
  if (current) {
    return current;
  }

  const created: PatientVitalsRecord = { timestamp };
  recordsByTimestamp.set(timestamp, created);
  return created;
}

function parseVitalsFromObservations(
  entries: Array<{ resource: ObservationLike }> | undefined,
): PatientVitalsRecord[] {
  if (!entries || entries.length === 0) {
    return [];
  }

  const recordsByTimestamp = new Map<string, PatientVitalsRecord>();

  for (const entry of entries) {
    const observation = entry.resource;
    const value = observation.valueQuantity?.value;

    if (typeof value !== 'number') {
      continue;
    }

    const timestamp = observation.effectiveDateTime ?? new Date().toISOString();
    const code = extractObservationCode(observation);
    const record = upsertRecord(recordsByTimestamp, timestamp);

    if (includesAny(code, SYSTOLIC_TOKENS)) {
      record.systolicBP = value;
      continue;
    }

    if (includesAny(code, DIASTOLIC_TOKENS)) {
      record.diastolicBP = value;
      continue;
    }

    if (includesAny(code, HEART_RATE_TOKENS)) {
      record.heartRate = value;
      continue;
    }

    if (includesAny(code, GLUCOSE_TOKENS)) {
      record.bloodGlucose = value;
    }
  }

  return Array.from(recordsByTimestamp.values()).sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

export interface UsePatientDashboardOptions {
  repository?: PatientDashboardRepository;
}

export function usePatientDashboard(options: UsePatientDashboardOptions = {}) {
  const repository = options.repository ?? createPatientDashboardRepository();

  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const patientData = ref<MCPPatientResponse | null>(null);
  const patientInsights = ref<string[]>([]);
  const vitalsRecords = ref<PatientVitalsRecord[]>([]);
  const consultationHistory = ref<ConsultationRecord[]>([]);

  const hasPatient = computed<boolean>(() => patientData.value !== null);

  async function loadPatientData(patientId: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const record = await repository.fetchPatientRecord(patientId);
      patientData.value = record.patient;
      patientInsights.value = record.insights;
      consultationHistory.value = record.consultationHistory;

      const parsedVitals = parseVitalsFromObservations(
        record.observationBundle?.entry,
      );
      vitalsRecords.value =
        parsedVitals.length > 0 ? parsedVitals : record.fallbackVitals;
    } catch (cause: unknown) {
      error.value =
        cause instanceof Error
          ? cause.message
          : '患者看板数据加载失败。';

      const fallbackRecord = await createPatientDashboardRepository(
        'mock',
      ).fetchPatientRecord(patientId);

      patientData.value = fallbackRecord.patient;
      patientInsights.value = fallbackRecord.insights;
      vitalsRecords.value = fallbackRecord.fallbackVitals;
      consultationHistory.value = fallbackRecord.consultationHistory;
    } finally {
      loading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    loading,
    error,
    patientData,
    patientInsights,
    vitalsRecords,
    consultationHistory,
    hasPatient,
    loadPatientData,
    clearError,
  };
}
