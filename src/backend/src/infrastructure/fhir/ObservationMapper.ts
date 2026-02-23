
import { HealthSignal } from '@copilot-care/shared/types';
import { Observation } from './types';

export class ObservationMapper {
  static toFHIR(signal: HealthSignal, patientId: string): Observation[] {
    const observations: Observation[] = [];
    const timestamp = signal.timestamp;
    const subject = { reference: `Patient/${patientId}` };

    const createObservation = (
      code: string,
      value: number,
      unit: string,
      ucumCode: string
    ): Observation => {
      return {
        resourceType: 'Observation',
        status: 'final',
        subject,
        effectiveDateTime: timestamp,
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: code,
            },
          ],
        },
        valueQuantity: {
          value,
          unit,
          system: 'http://unitsofmeasure.org',
          code: ucumCode,
        },
      };
    };

    if (signal.systolicBP !== undefined) {
      observations.push(createObservation('8480-6', signal.systolicBP, 'mmHg', 'mmHg'));
    }

    if (signal.diastolicBP !== undefined) {
      observations.push(createObservation('8462-4', signal.diastolicBP, 'mmHg', 'mmHg'));
    }

    if (signal.heartRate !== undefined) {
      observations.push(createObservation('8867-4', signal.heartRate, '/min', '/min'));
    }

    if (signal.spo2 !== undefined) {
      observations.push(createObservation('2708-6', signal.spo2, '%', '%'));
    }

    if (signal.bloodGlucose !== undefined) {
      observations.push(createObservation('2339-0', signal.bloodGlucose, 'mg/dL', 'mg/dL'));
    }

    if (signal.bloodLipid !== undefined) {
      observations.push(createObservation('2093-3', signal.bloodLipid, 'mg/dL', 'mg/dL'));
    }

    return observations;
  }
}
