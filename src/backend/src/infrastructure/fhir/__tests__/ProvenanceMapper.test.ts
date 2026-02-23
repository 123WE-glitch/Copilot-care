import { AuditEvent } from '@copilot-care/shared/types';
import { ProvenanceMapper } from '../ProvenanceMapper';

describe('ProvenanceMapper', () => {
  const mockEvent: AuditEvent = {
    eventId: 'evt-123',
    sessionId: 'sess-456',
    timestamp: '2023-10-27T10:00:00Z',
    phase: 'RISK_EVALUATION',
    eventType: 'BAND_SELECTED',
    details: 'Risk assessment completed',
    actor: 'Dr. Smith',
    action: 'Assess Risk',
    decisionRef: 'dec-789',
  };

  const patientId = 'pat-001';

  it('should map basic fields correctly', () => {
    const provenance = ProvenanceMapper.toFHIR(mockEvent, patientId);

    expect(provenance.resourceType).toBe('Provenance');
    expect(provenance.id).toBe('evt-123');
    expect(provenance.target).toHaveLength(1);
    expect(provenance.target[0].reference).toBe('Patient/pat-001');
    expect(provenance.recorded).toBe('2023-10-27T10:00:00Z');
  });

  it('should map agent with actor correctly', () => {
    const provenance = ProvenanceMapper.toFHIR(mockEvent, patientId);

    expect(provenance.agent).toHaveLength(1);
    expect(provenance.agent[0].type?.coding?.[0].system).toBe('http://terminology.hl7.org/CodeSystem/provenance-participant-type');
    expect(provenance.agent[0].type?.coding?.[0].code).toBe('author');
    expect(provenance.agent[0].who?.reference).toBe('Practitioner/Dr. Smith');
  });

  it('should map agent without actor correctly (default to Device)', () => {
    const eventWithoutActor = { ...mockEvent, actor: undefined };
    const provenance = ProvenanceMapper.toFHIR(eventWithoutActor, patientId);

    expect(provenance.agent).toHaveLength(1);
    expect(provenance.agent[0].who?.reference).toBe('Device/CoPilotCare');
  });

  it('should map activity if present', () => {
    const provenance = ProvenanceMapper.toFHIR(mockEvent, patientId);
    expect(provenance.activity?.text).toBe('Assess Risk');
  });

  it('should not map activity if absent', () => {
    const eventWithoutAction = { ...mockEvent, action: undefined };
    const provenance = ProvenanceMapper.toFHIR(eventWithoutAction, patientId);
    expect(provenance.activity).toBeUndefined();
  });

  it('should map reason from details', () => {
    const provenance = ProvenanceMapper.toFHIR(mockEvent, patientId);
    expect(provenance.reason).toHaveLength(1);
    expect(provenance.reason?.[0].text).toBe('Risk assessment completed');
  });
});
