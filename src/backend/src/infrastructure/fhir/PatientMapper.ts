import { PatientProfile } from '@copilot-care/shared/types';
import { Patient, HumanName } from './types';

export class PatientMapper {
  static toFHIR(profile: PatientProfile): Patient {
    const patient: Patient = {
      resourceType: 'Patient',
      id: profile.patientId,
      identifier: [
        {
          system: 'urn:oid:2.16.840.1.113883.2.4.6.3',
          value: profile.patientId,
        },
      ],
      active: true,
      gender: profile.sex,
    };

    // Map name
    if (profile.name && profile.name.trim().length > 0) {
      const parts = profile.name.trim().split(/\s+/);
      const humanName: HumanName = {
        use: 'official',
      };

      if (parts.length > 0) {
        if (parts.length === 1) {
          humanName.given = [parts[0]];
        } else {
          // Last part is family name, rest are given names
          humanName.family = parts[parts.length - 1];
          humanName.given = parts.slice(0, parts.length - 1);
        }
        patient.name = [humanName];
      }
    }

    // Map birthDate
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - profile.age;
    patient.birthDate = birthYear.toString();

    return patient;
  }
}
