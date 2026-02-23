import { Request, Response, Router } from 'express';
import { Patient, Observation } from '../../infrastructure/fhir/types';
import { ProvenanceMapper } from '../../infrastructure/fhir/ProvenanceMapper';
import { AuditEvent } from '@copilot-care/shared/types';

const mockPatients: Patient[] = [
  {
    resourceType: 'Patient',
    id: 'patient-001',
    active: true,
    gender: 'male',
    birthDate: '1970-01-01',
    name: [{ family: '张', given: ['三'] }],
    identifier: [
      {
        system: 'urn:oid:2.16.840.1.113883.2.4.6.3',
        value: 'patient-001',
      },
    ],
  },
  {
    resourceType: 'Patient',
    id: 'patient-002',
    active: true,
    gender: 'female',
    birthDate: '1985-05-15',
    name: [{ family: '李', given: ['四'] }],
    identifier: [
      {
        system: 'urn:oid:2.16.840.1.113883.2.4.6.3',
        value: 'patient-002',
      },
    ],
  },
];

const mockObservations: Observation[] = [
  {
    resourceType: 'Observation',
    id: 'obs-bp-systolic-001',
    status: 'final',
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '8480-6',
          display: 'Systolic blood pressure',
        },
      ],
      text: '收缩压',
    },
    subject: { reference: 'Patient/patient-001' },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: 145,
      unit: 'mmHg',
      system: 'http://unitsofmeasure.org',
      code: 'mm[Hg]',
    },
  },
  {
    resourceType: 'Observation',
    id: 'obs-bp-diastolic-001',
    status: 'final',
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '8462-4',
          display: 'Diastolic blood pressure',
        },
      ],
      text: '舒张压',
    },
    subject: { reference: 'Patient/patient-001' },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: 92,
      unit: 'mmHg',
      system: 'http://unitsofmeasure.org',
      code: 'mm[Hg]',
    },
  },
  {
    resourceType: 'Observation',
    id: 'obs-heart-rate-001',
    status: 'final',
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '8867-4',
          display: 'Heart rate',
        },
      ],
      text: '心率',
    },
    subject: { reference: 'Patient/patient-001' },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: 78,
      unit: '/min',
      system: 'http://unitsofmeasure.org',
      code: '/min',
    },
  },
  {
    resourceType: 'Observation',
    id: 'obs-glucose-001',
    status: 'final',
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '2339-0',
          display: 'Glucose [Mass/volume] in Blood',
        },
      ],
      text: '血糖',
    },
    subject: { reference: 'Patient/patient-002' },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: 6.5,
      unit: 'mmol/L',
      system: 'http://unitsofmeasure.org',
      code: 'mmol/L',
    },
  },
];

const mockAuditEvents: AuditEvent[] = [
  {
    eventId: 'audit-001',
    sessionId: 'session-001',
    timestamp: new Date().toISOString(),
    phase: 'INFO_GATHER',
    eventType: 'STAGE_TRANSITION',
    details: 'Patient data retrieved',
    actor: 'CoPilotCare',
    action: 'Patient demographics accessed',
  },
];

export function createFhirRouter(): Router {
  const router = Router();

  router.get('/Patient', (_req: Request, res: Response) => {
    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: mockPatients.length,
      entry: mockPatients.map((patient) => ({
        resource: patient,
      })),
    };
    res.status(200).json(bundle);
  });

  router.get('/Patient/:id', (req: Request, res: Response) => {
    const patient = mockPatients.find((p) => p.id === req.params.id);
    if (!patient) {
      res.status(404).json({
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'not-found',
            diagnostics: `Patient with ID ${req.params.id} not found`,
          },
        ],
      });
      return;
    }
    res.status(200).json(patient);
  });

  router.get('/Observation', (req: Request, res: Response) => {
    let observations = [...mockObservations];
    
    const patientId = req.query['patient'] as string | undefined;
    if (patientId) {
      const patientRef = `Patient/${patientId}`;
      observations = observations.filter(
        (obs) => obs.subject?.reference === patientRef,
      );
    }

    const code = req.query.code as string | undefined;
    if (code) {
      observations = observations.filter(
        (obs) => obs.code?.coding?.some((c: { code?: string }) => c.code === code),
      );
    }

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: observations.length,
      entry: observations.map((observation) => ({
        resource: observation,
      })),
    };
    res.status(200).json(bundle);
  });

  router.get('/Observation/:id', (req: Request, res: Response) => {
    const observation = mockObservations.find((o) => o.id === req.params.id);
    if (!observation) {
      res.status(404).json({
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'not-found',
            diagnostics: `Observation with ID ${req.params.id} not found`,
          },
        ],
      });
      return;
    }
    res.status(200).json(observation);
  });

  router.get('/Provenance', (req: Request, res: Response) => {
    const patientId = req.query['patient'] as string | undefined;
    
    const provenances = mockAuditEvents.map((event) => 
      ProvenanceMapper.toFHIR(event, patientId || 'patient-001'),
    );

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: provenances.length,
      entry: provenances.map((provenance) => ({
        resource: provenance,
      })),
    };
    res.status(200).json(bundle);
  });

  router.get('/metadata', (_req: Request, res: Response) => {
    const capabilityStatement = {
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: new Date().toISOString(),
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['json'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Patient',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
              ],
              searchParam: [
                { name: 'identifier', type: 'token' },
              ],
            },
            {
              type: 'Observation',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
              ],
              searchParam: [
                { name: 'patient', type: 'reference' },
                { name: 'code', type: 'token' },
                { name: 'date', type: 'date' },
              ],
            },
            {
              type: 'Provenance',
              interaction: [
                { code: 'search-type' },
              ],
              searchParam: [
                { name: 'patient', type: 'reference' },
              ],
            },
          ],
        },
      ],
    };
    res.status(200).json(capabilityStatement);
  });

  return router;
}
