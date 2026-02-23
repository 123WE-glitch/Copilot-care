import {
  TriageRequest,
  TriageStatus,
} from '@copilot-care/shared/types';

export interface LongitudinalFollowUpExpectation {
  status: TriageStatus;
  expectedProgression: 'improving' | 'stable' | 'worsening';
  weekOverWeekChange?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    bloodGlucose?: number;
  };
}

export interface LongitudinalScenarioCase {
  id: string;
  patientId: string;
  title: string;
  weeks: Array<{
    weekNumber: number;
    request: TriageRequest;
    expected: LongitudinalFollowUpExpectation;
  }>;
}

export const LONGITUDINAL_SCENARIOS: LongitudinalScenarioCase[] = [
  {
    id: 'L-001',
    patientId: 'longitudinal-hypertension-001',
    title: 'Hypertension management with gradual improvement',
    weeks: [
      {
        weekNumber: 1,
        request: {
          sessionId: 'l001-week1',
          consentToken: 'consent_local_demo',
          profile: {
            patientId: 'longitudinal-hypertension-001',
            age: 55,
            sex: 'male',
            chronicDiseases: ['Hypertension'],
            medicationHistory: ['amlodipine 5mg'],
            vitals: {
              systolicBP: 155,
              diastolicBP: 98,
            },
            symptoms: ['headache', 'dizziness'],
          },
        },
        expected: {
          status: 'OUTPUT',
          expectedProgression: 'stable',
        },
      },
      {
        weekNumber: 2,
        request: {
          sessionId: 'l001-week2',
          consentToken: 'consent_local_demo',
          profile: {
            patientId: 'longitudinal-hypertension-001',
            age: 55,
            sex: 'male',
            chronicDiseases: ['Hypertension'],
            medicationHistory: ['amlodipine 5mg'],
            vitals: {
              systolicBP: 148,
              diastolicBP: 94,
            },
            symptoms: ['mild dizziness'],
          },
        },
        expected: {
          status: 'OUTPUT',
          expectedProgression: 'improving',
          weekOverWeekChange: {
            systolicBP: -7,
            diastolicBP: -4,
          },
        },
      },
      {
        weekNumber: 4,
        request: {
          sessionId: 'l001-week4',
          consentToken: 'consent_local_demo',
          profile: {
            patientId: 'longitudinal-hypertension-001',
            age: 55,
            sex: 'male',
            chronicDiseases: ['Hypertension'],
            medicationHistory: ['amlodipine 5mg'],
            vitals: {
              systolicBP: 138,
              diastolicBP: 88,
            },
            symptoms: ['stable'],
          },
        },
        expected: {
          status: 'OUTPUT',
          expectedProgression: 'improving',
          weekOverWeekChange: {
            systolicBP: -10,
            diastolicBP: -6,
          },
        },
      },
    ],
  },
  {
    id: 'L-002',
    patientId: 'longitudinal-diabetes-001',
    title: 'Diabetes management with lifestyle intervention',
    weeks: [
      {
        weekNumber: 1,
        request: {
          sessionId: 'l002-week1',
          consentToken: 'consent_local_demo',
          profile: {
            patientId: 'longitudinal-diabetes-001',
            age: 48,
            sex: 'female',
            chronicDiseases: ['Prediabetes'],
            medicationHistory: [],
            vitals: {
              bloodGlucose: 145,
            },
            symptoms: ['fatigue', 'thirst'],
          },
        },
        expected: {
          status: 'OUTPUT',
          expectedProgression: 'stable',
        },
      },
      {
        weekNumber: 3,
        request: {
          sessionId: 'l002-week3',
          consentToken: 'consent_local_demo',
          profile: {
            patientId: 'longitudinal-diabetes-001',
            age: 48,
            sex: 'female',
            chronicDiseases: ['Prediabetes'],
            medicationHistory: [],
            lifestyleTags: ['diet_control', 'exercise'],
            vitals: {
              bloodGlucose: 128,
            },
            symptoms: ['improved energy'],
          },
        },
        expected: {
          status: 'OUTPUT',
          expectedProgression: 'improving',
          weekOverWeekChange: {
            bloodGlucose: -17,
          },
        },
      },
      {
        weekNumber: 6,
        request: {
          sessionId: 'l002-week6',
          consentToken: 'consent_local_demo',
          profile: {
            patientId: 'longitudinal-diabetes-001',
            age: 48,
            sex: 'female',
            chronicDiseases: ['Prediabetes'],
            medicationHistory: [],
            lifestyleTags: ['diet_control', 'exercise'],
            vitals: {
              bloodGlucose: 108,
            },
            symptoms: ['stable'],
          },
        },
        expected: {
          status: 'OUTPUT',
          expectedProgression: 'improving',
          weekOverWeekChange: {
            bloodGlucose: -20,
          },
        },
      },
    ],
  },
  {
    id: 'L-003',
    patientId: 'longitudinal-cardiac-001',
    title: 'Cardiac risk escalation requiring intervention',
    weeks: [
      {
        weekNumber: 1,
        request: {
          sessionId: 'l003-week1',
          consentToken: 'consent_local_demo',
          profile: {
            patientId: 'longitudinal-cardiac-001',
            age: 65,
            sex: 'male',
            chronicDiseases: ['Hypertension', 'Coronary Artery Disease'],
            medicationHistory: ['aspirin', 'metoprolol'],
            vitals: {
              systolicBP: 142,
              diastolicBP: 88,
              heartRate: 72,
            },
            symptoms: ['stable'],
          },
        },
        expected: {
          status: 'OUTPUT',
          expectedProgression: 'stable',
        },
      },
      {
        weekNumber: 2,
        request: {
          sessionId: 'l003-week2',
          consentToken: 'consent_local_demo',
          profile: {
            patientId: 'longitudinal-cardiac-001',
            age: 65,
            sex: 'male',
            chronicDiseases: ['Hypertension', 'Coronary Artery Disease'],
            medicationHistory: ['aspirin', 'metoprolol'],
            vitals: {
              systolicBP: 158,
              diastolicBP: 95,
              heartRate: 85,
            },
            symptoms: ['mild chest discomfort', 'fatigue'],
          },
        },
        expected: {
          status: 'OUTPUT',
          expectedProgression: 'worsening',
          weekOverWeekChange: {
            systolicBP: 16,
            diastolicBP: 7,
            heartRate: 13,
          },
        },
      },
      {
        weekNumber: 3,
        request: {
          sessionId: 'l003-week3',
          consentToken: 'consent_local_demo',
          profile: {
            patientId: 'longitudinal-cardiac-001',
            age: 65,
            sex: 'male',
            chronicDiseases: ['Hypertension', 'Coronary Artery Disease'],
            medicationHistory: ['aspirin', 'metoprolol'],
            vitals: {
              systolicBP: 175,
              diastolicBP: 105,
              heartRate: 98,
            },
            symptoms: ['chest pain', 'shortness of breath', 'sweating'],
          },
        },
        expected: {
          status: 'ESCALATE_TO_OFFLINE',
          expectedProgression: 'worsening',
          weekOverWeekChange: {
            systolicBP: 17,
            diastolicBP: 10,
            heartRate: 13,
          },
        },
      },
    ],
  },
];

export function getLongitudinalScenarioById(id: string): LongitudinalScenarioCase | undefined {
  return LONGITUDINAL_SCENARIOS.find(s => s.id === id);
}

export function getAllLongitudinalWeeks(): Array<{
  scenarioId: string;
  patientId: string;
  weekNumber: number;
  request: TriageRequest;
  expected: LongitudinalFollowUpExpectation;
}> {
  const result: Array<{
    scenarioId: string;
    patientId: string;
    weekNumber: number;
    request: TriageRequest;
    expected: LongitudinalFollowUpExpectation;
  }> = [];

  for (const scenario of LONGITUDINAL_SCENARIOS) {
    for (const week of scenario.weeks) {
      result.push({
        scenarioId: scenario.id,
        patientId: scenario.patientId,
        weekNumber: week.weekNumber,
        request: week.request,
        expected: week.expected,
      });
    }
  }

  return result;
}
