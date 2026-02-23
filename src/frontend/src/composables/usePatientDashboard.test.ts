import { describe, expect, it } from 'vitest';
import { usePatientDashboard } from './usePatientDashboard';
import type { PatientDashboardRepository } from '../features/patient/repository';

describe('usePatientDashboard', () => {
  it('loads repository data for happy path', async () => {
    const repository: PatientDashboardRepository = {
      fetchPatientRecord: async () => ({
        patient: {
          patientId: 'patient-001',
          name: 'Patient 001',
          sex: 'male',
          age: 55,
        },
        insights: ['Stable profile'],
        observationBundle: {
          resourceType: 'Bundle',
          type: 'searchset',
          total: 3,
          entry: [
            {
              resource: {
                resourceType: 'Observation',
                id: 'obs-sys',
                status: 'final',
                code: { text: 'Systolic blood pressure' },
                effectiveDateTime: '2026-02-01T08:00:00.000Z',
                valueQuantity: { value: 138 },
              },
            },
            {
              resource: {
                resourceType: 'Observation',
                id: 'obs-dia',
                status: 'final',
                code: { text: 'Diastolic blood pressure' },
                effectiveDateTime: '2026-02-01T08:00:00.000Z',
                valueQuantity: { value: 84 },
              },
            },
            {
              resource: {
                resourceType: 'Observation',
                id: 'obs-hr',
                status: 'final',
                code: { text: 'Heart rate' },
                effectiveDateTime: '2026-02-01T08:00:00.000Z',
                valueQuantity: { value: 72 },
              },
            },
          ],
        },
        fallbackVitals: [],
        consultationHistory: [
          {
            id: 'consult-1',
            date: '2026-02-01T08:00:00.000Z',
            conclusion: 'Follow-up in one week.',
            department: 'Cardiology',
            status: 'OUTPUT',
            triageLevel: 'medium',
          },
        ],
      }),
    };

    const dashboard = usePatientDashboard({ repository });
    await dashboard.loadPatientData('patient-001');

    expect(dashboard.patientData.value?.patientId).toBe('patient-001');
    expect(dashboard.vitalsRecords.value).toHaveLength(1);
    expect(dashboard.vitalsRecords.value[0].systolicBP).toBe(138);
    expect(dashboard.vitalsRecords.value[0].diastolicBP).toBe(84);
    expect(dashboard.vitalsRecords.value[0].heartRate).toBe(72);
    expect(dashboard.loading.value).toBe(false);
  });

  it('falls back to repository fallback vitals when observation bundle is empty', async () => {
    const repository: PatientDashboardRepository = {
      fetchPatientRecord: async () => ({
        patient: {
          patientId: 'patient-404',
          name: 'Fallback Patient',
        },
        insights: ['Mock insight'],
        observationBundle: {
          resourceType: 'Bundle',
          type: 'searchset',
          total: 0,
          entry: [],
        },
        fallbackVitals: [
          {
            timestamp: '2026-02-02T00:00:00.000Z',
            systolicBP: 130,
            diastolicBP: 82,
          },
        ],
        consultationHistory: [],
      }),
    };

    const dashboard = usePatientDashboard({ repository });
    await dashboard.loadPatientData('patient-404');

    expect(dashboard.vitalsRecords.value).toHaveLength(1);
    expect(dashboard.vitalsRecords.value[0].systolicBP).toBe(130);
    expect(dashboard.patientInsights.value).toEqual(['Mock insight']);
  });

  it('recovers with mock repository data when repository throws', async () => {
    const repository: PatientDashboardRepository = {
      fetchPatientRecord: async () => {
        throw new Error('failed upstream');
      },
    };

    const dashboard = usePatientDashboard({ repository });
    await dashboard.loadPatientData('patient-err');

    expect(dashboard.error.value).toBe('failed upstream');
    expect(dashboard.patientData.value?.patientId).toBe('patient-err');
    expect(dashboard.vitalsRecords.value.length).toBeGreaterThan(0);
    expect(dashboard.consultationHistory.value.length).toBeGreaterThan(0);
  });
});
