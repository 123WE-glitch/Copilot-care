import { AuditEvent } from '@copilot-care/shared/types';
import { Provenance, ProvenanceAgent } from './types';

export class ProvenanceMapper {
  static toFHIR(event: AuditEvent, patientId: string): Provenance {
    const agent: ProvenanceAgent = {
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type',
            code: 'author',
          },
        ],
      },
      who: {
        reference: event.actor ? `Practitioner/${event.actor}` : 'Device/CoPilotCare',
      },
    };

    const provenance: Provenance = {
      resourceType: 'Provenance',
      id: event.eventId,
      target: [
        {
          reference: `Patient/${patientId}`,
        },
      ],
      recorded: event.timestamp,
      agent: [agent],
    };

    if (event.action) {
      provenance.activity = {
        text: event.action,
      };
    }

    if (event.details) {
      provenance.reason = [
        {
          text: event.details,
        },
      ];
    }

    return provenance;
  }
}
