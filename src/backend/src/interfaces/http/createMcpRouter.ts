import { Request, Response, Router } from 'express';
import { PatientProfile, HealthSignal } from '@copilot-care/shared/types';

interface MockPatientData {
  profilePatch: Partial<PatientProfile>;
  signals: HealthSignal[];
  insights: string[];
}

const mockPatientDatabase: Record<string, MockPatientData> = {
  'patient-001': {
    profilePatch: {
      age: 56,
      sex: 'male',
      name: '张三',
      chiefComplaint: '头晕、血压偏高',
      chronicDiseases: ['Hypertension', 'Hyperlipidemia'],
      medicationHistory: ['Amlodipine 5mg', 'Atorvastatin 20mg'],
      lifestyleTags: ['戒烟', '适度运动'],
      tcmConstitution: '气虚质',
    },
    signals: [
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        source: 'wearable',
        systolicBP: 148,
        diastolicBP: 95,
        heartRate: 76,
      },
      {
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        source: 'wearable',
        systolicBP: 152,
        diastolicBP: 98,
        heartRate: 78,
      },
    ],
    insights: [
      '患者近两天血压波动，收缩压波动在148-152mmHg',
      '建议关注降压药物依从性',
      '可考虑生活方式的进一步干预',
    ],
  },
  'patient-002': {
    profilePatch: {
      age: 49,
      sex: 'female',
      name: '李四',
      chiefComplaint: '多饮多尿、体重下降',
      chronicDiseases: ['Prediabetes', 'Obesity'],
      medicationHistory: ['Metformin 500mg'],
      lifestyleTags: ['控制饮食', '定期锻炼'],
      tcmConstitution: '痰湿质',
    },
    signals: [
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        source: 'wearable',
        bloodGlucose: 6.8,
        heartRate: 72,
      },
      {
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        source: 'hospital',
        bloodGlucose: 7.2,
      },
    ],
    insights: [
      '患者血糖控制不佳，空腹血糖波动在6.8-7.2mmol/L',
      '建议复查糖化血红蛋白',
      '需关注糖尿病并发症筛查',
    ],
  },
};

export function createMcpRouter(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      mode: 'mock',
      endpoints: [
        'GET /mcp/patient/context',
        'GET /mcp/patient/:id',
        'GET /mcp/patient/:id/signals',
        'GET /mcp/patient/:id/insights',
      ],
    });
  });

  router.post('/patient/context', (req: Request, res: Response) => {
    const { profile, consentToken } = req.body;

    if (!profile?.patientId) {
      res.status(400).json({
        error: 'missing_patient_id',
        message: 'Patient ID is required',
      });
      return;
    }

    if (!consentToken) {
      res.status(401).json({
        error: 'missing_consent',
        message: 'Consent token is required for MCP access',
      });
      return;
    }

    const mockData = mockPatientDatabase[profile.patientId];

    if (!mockData) {
      res.status(200).json({
        profilePatch: {},
        signals: [],
        insights: ['未找到该患者的云端数据'],
      });
      return;
    }

    res.status(200).json(mockData);
  });

  router.get('/patient/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const mockData = mockPatientDatabase[id];

    if (!mockData) {
      res.status(404).json({
        error: 'not_found',
        message: `Patient ${id} not found`,
      });
      return;
    }

    res.status(200).json({
      patientId: id,
      ...mockData.profilePatch,
    });
  });

  router.get('/patient/:id/signals', (req: Request, res: Response) => {
    const { id } = req.params;
    const mockData = mockPatientDatabase[id];

    if (!mockData) {
      res.status(404).json({
        error: 'not_found',
        message: `Patient ${id} not found`,
      });
      return;
    }

    res.status(200).json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: mockData.signals.length,
      entry: mockData.signals.map((signal) => ({ resource: signal })),
    });
  });

  router.get('/patient/:id/insights', (req: Request, res: Response) => {
    const { id } = req.params;
    const mockData = mockPatientDatabase[id];

    if (!mockData) {
      res.status(404).json({
        error: 'not_found',
        message: `Patient ${id} not found`,
      });
      return;
    }

    res.status(200).json({
      patientId: id,
      insights: mockData.insights,
      generatedAt: new Date().toISOString(),
    });
  });

  return router;
}
