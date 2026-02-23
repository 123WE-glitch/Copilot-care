import {
  fhirApi,
  mcpApi,
  type FHIRBundle,
  type FHIRObservation,
  type MCPPatientResponse,
} from '../../services/api';
import {
  createMockConsultationHistory,
  createMockInsights,
  createMockPatient,
  createMockVitals,
} from './mock';
import type {
  ConsultationRecord,
  PatientVitalsRecord,
} from './model';

export type PatientDataSource = 'mock' | 'api' | 'hybrid';

export interface PatientRepositoryRecord {
  patient: MCPPatientResponse;
  insights: string[];
  observationBundle: FHIRBundle<FHIRObservation> | null;
  fallbackVitals: PatientVitalsRecord[];
  consultationHistory: ConsultationRecord[];
}

export interface PatientDashboardRepository {
  fetchPatientRecord(patientId: string): Promise<PatientRepositoryRecord>;
}

function resolvePatientDataSource(): PatientDataSource {
  const raw = import.meta.env.VITE_PATIENT_DATA_SOURCE;

  if (raw === 'mock' || raw === 'api' || raw === 'hybrid') {
    return raw;
  }

  return 'hybrid';
}

function createMockRecord(patientId: string): PatientRepositoryRecord {
  const resolvedPatientId = patientId || 'demo-001';

  return {
    patient: createMockPatient(resolvedPatientId),
    insights: createMockInsights(),
    observationBundle: null,
    fallbackVitals: createMockVitals(),
    consultationHistory: createMockConsultationHistory(),
  };
}

async function createApiRecord(patientId: string): Promise<PatientRepositoryRecord> {
  const [patient, insights, observationBundle] = await Promise.all([
    mcpApi.getPatient(patientId),
    mcpApi.getPatientInsights(patientId),
    fhirApi.getObservations({ patient: patientId }),
  ]);

  return {
    patient,
    insights: insights.insights,
    observationBundle,
    fallbackVitals: createMockVitals(),
    consultationHistory: createMockConsultationHistory(),
  };
}

async function createHybridRecord(patientId: string): Promise<PatientRepositoryRecord> {
  const mockRecord = createMockRecord(patientId);

  const [patient, insights, observationBundle] = await Promise.all([
    mcpApi.getPatient(patientId).catch(() => null),
    mcpApi.getPatientInsights(patientId).catch(() => null),
    fhirApi.getObservations({ patient: patientId }).catch(() => null),
  ]);

  return {
    patient: patient ?? mockRecord.patient,
    insights:
      insights?.insights && insights.insights.length > 0
        ? insights.insights
        : mockRecord.insights,
    observationBundle,
    fallbackVitals: mockRecord.fallbackVitals,
    consultationHistory: mockRecord.consultationHistory,
  };
}

export function createPatientDashboardRepository(
  source: PatientDataSource = resolvePatientDataSource(),
): PatientDashboardRepository {
  return {
    async fetchPatientRecord(patientId: string): Promise<PatientRepositoryRecord> {
      if (!patientId || source === 'mock') {
        return createMockRecord(patientId);
      }

      if (source === 'api') {
        return createApiRecord(patientId);
      }

      return createHybridRecord(patientId);
    },
  };
}
