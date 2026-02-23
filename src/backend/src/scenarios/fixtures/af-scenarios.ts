import {
  ErrorCode,
  TriageRequest,
  TriageStatus,
} from '@copilot-care/shared/types';

export interface AFScenarioExpectation {
  status: TriageStatus;
  errorCode?: ErrorCode;
  requireFinalConsensus?: boolean;
  minRounds?: number;
  maxRounds?: number;
  expectIdempotentReplay?: boolean;
}

export interface AFScenarioCase {
  id: 'T-001' | 'T-002' | 'T-003' | 'T-004' | 'T-005' | 'T-006';
  caseCode:
    | 'Case-A-001'
    | 'Case-B-001'
    | 'Case-C-001'
    | 'Case-D-001'
    | 'Case-E-001'
    | 'Case-F-001';
  title: string;
  request: TriageRequest;
  expected: AFScenarioExpectation;
}

export const AF_SCENARIOS: AFScenarioCase[] = [
  {
    id: 'T-001',
    caseCode: 'Case-A-001',
    title: 'first triage for hypertension profile',
    request: {
      sessionId: 'case-a-001',
      consentToken: 'consent_local_demo',
      profile: {
        patientId: 'case-a-001',
        age: 55,
        sex: 'male',
        chronicDiseases: ['Hypertension'],
        medicationHistory: ['amlodipine'],
        vitals: {
          systolicBP: 145,
          diastolicBP: 92,
        },
        symptoms: ['mild dizziness'],
      },
    },
    expected: {
      status: 'OUTPUT',
      requireFinalConsensus: true,
      minRounds: 1,
      maxRounds: 3,
    },
  },
  {
    id: 'T-002',
    caseCode: 'Case-B-001',
    title: 'continuous abnormal values without red-flag short circuit',
    request: {
      sessionId: 'case-b-001',
      consentToken: 'consent_local_demo',
      profile: {
        patientId: 'case-b-001',
        age: 60,
        sex: 'female',
        chronicDiseases: ['Hypertension'],
        medicationHistory: ['none'],
        vitals: {
          systolicBP: 172,
          diastolicBP: 108,
        },
        symptoms: ['headache'],
      },
    },
    expected: {
      status: 'OUTPUT',
      requireFinalConsensus: true,
      minRounds: 1,
      maxRounds: 3,
    },
  },
  {
    id: 'T-003',
    caseCode: 'Case-C-001',
    title: 'missing required data triggers safe error path',
    request: {
      sessionId: 'case-c-001',
      consentToken: 'consent_local_demo',
      profile: {
        patientId: 'case-c-001',
        age: 46,
        sex: 'female',
        chronicDiseases: [],
      } as unknown as TriageRequest['profile'],
    },
    expected: {
      status: 'ERROR',
      errorCode: 'ERR_MISSING_REQUIRED_DATA',
      maxRounds: 0,
    },
  },
  {
    id: 'T-004',
    caseCode: 'Case-D-001',
    title: 'multi-agent conflict needs arbitration before output',
    request: {
      sessionId: 'case-d-001',
      consentToken: 'consent_local_demo',
      profile: {
        patientId: 'case-d-001',
        age: 70,
        sex: 'female',
        chronicDiseases: ['Hypertension', 'Diabetes', 'Dyslipidemia'],
        medicationHistory: ['metformin'],
        vitals: {
          systolicBP: 165,
          diastolicBP: 98,
        },
        symptoms: ['fatigue', 'thirst'],
      },
    },
    expected: {
      status: 'OUTPUT',
      requireFinalConsensus: true,
      minRounds: 1,
      maxRounds: 3,
    },
  },
  {
    id: 'T-005',
    caseCode: 'Case-E-001',
    title: 'revisit consistency with same session id',
    request: {
      sessionId: 'case-e-001',
      consentToken: 'consent_local_demo',
      profile: {
        patientId: 'case-e-001',
        age: 58,
        sex: 'male',
        chronicDiseases: ['Hypertension'],
        medicationHistory: ['amlodipine'],
        vitals: {
          systolicBP: 132,
          diastolicBP: 84,
        },
        symptoms: ['stable'],
      },
    },
    expected: {
      status: 'OUTPUT',
      requireFinalConsensus: true,
      minRounds: 1,
      maxRounds: 2,
      expectIdempotentReplay: true,
    },
  },
  {
    id: 'T-006',
    caseCode: 'Case-F-001',
    title: 'difficult consult with red-flag escalation',
    request: {
      sessionId: 'case-f-001',
      consentToken: 'consent_local_demo',
      profile: {
        patientId: 'case-f-001',
        age: 68,
        sex: 'male',
        chronicDiseases: ['Hypertension', 'Diabetes'],
        medicationHistory: ['metformin'],
        vitals: {
          systolicBP: 182,
          diastolicBP: 112,
        },
        symptoms: ['chest pain', 'shortness of breath'],
      },
    },
    expected: {
      status: 'ESCALATE_TO_OFFLINE',
      errorCode: 'ERR_ESCALATE_TO_OFFLINE',
      maxRounds: 0,
    },
  },
];
