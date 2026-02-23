import { PatientMapper } from '../PatientMapper';
import { PatientProfile } from '@copilot-care/shared/types';
import { Patient } from '../types';

describe('PatientMapper', () => {
  const baseProfile: PatientProfile = {
    patientId: 'P12345',
    age: 30,
    sex: 'male',
    chronicDiseases: [],
    medicationHistory: [],
  };

  it('should map basic fields correctly', () => {
    const patient = PatientMapper.toFHIR(baseProfile);

    expect(patient.resourceType).toBe('Patient');
    expect(patient.id).toBe('P12345');
    expect(patient.active).toBe(true);
    expect(patient.gender).toBe('male');
    
    // Check identifier
    expect(patient.identifier).toHaveLength(1);
    expect(patient.identifier![0].system).toBe('urn:oid:2.16.840.1.113883.2.4.6.3');
    expect(patient.identifier![0].value).toBe('P12345');

    // Check birthDate (approximate)
    const currentYear = new Date().getFullYear();
    const expectedBirthYear = (currentYear - 30).toString();
    expect(patient.birthDate).toBe(expectedBirthYear);
  });

  it('should map gender correctly', () => {
    const femaleProfile: PatientProfile = { ...baseProfile, sex: 'female' };
    const otherProfile: PatientProfile = { ...baseProfile, sex: 'other' };

    expect(PatientMapper.toFHIR(femaleProfile).gender).toBe('female');
    expect(PatientMapper.toFHIR(otherProfile).gender).toBe('other');
  });

  it('should handle single name correctly', () => {
    const profile: PatientProfile = { ...baseProfile, name: 'John' };
    const patient = PatientMapper.toFHIR(profile);

    expect(patient.name).toHaveLength(1);
    expect(patient.name![0].given).toEqual(['John']);
    expect(patient.name![0].family).toBeUndefined();
  });

  it('should handle full name correctly', () => {
    const profile: PatientProfile = { ...baseProfile, name: 'John Doe' };
    const patient = PatientMapper.toFHIR(profile);

    expect(patient.name).toHaveLength(1);
    expect(patient.name![0].given).toEqual(['John']);
    expect(patient.name![0].family).toBe('Doe');
  });

  it('should handle name with multiple parts correctly', () => {
    const profile: PatientProfile = { ...baseProfile, name: 'John Middle Doe' };
    const patient = PatientMapper.toFHIR(profile);

    expect(patient.name).toHaveLength(1);
    expect(patient.name![0].given).toEqual(['John', 'Middle']);
    expect(patient.name![0].family).toBe('Doe');
  });

  it('should handle missing name', () => {
    const profile: PatientProfile = { ...baseProfile, name: undefined };
    const patient = PatientMapper.toFHIR(profile);

    expect(patient.name).toBeUndefined();
  });
  
  it('should trim name before splitting', () => {
     const profile: PatientProfile = { ...baseProfile, name: '  John   Doe  ' };
     const patient = PatientMapper.toFHIR(profile);
     
     expect(patient.name).toHaveLength(1);
     expect(patient.name![0].given).toEqual(['John']);
     expect(patient.name![0].family).toBe('Doe');
  });
});
