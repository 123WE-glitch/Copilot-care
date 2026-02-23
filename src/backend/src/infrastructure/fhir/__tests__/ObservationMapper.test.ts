
import { ObservationMapper } from '../ObservationMapper';
import { HealthSignal } from '@copilot-care/shared/types';
import { Observation } from '../types';

describe('ObservationMapper', () => {
  const patientId = 'patient-123';
  const timestamp = '2023-10-27T10:00:00Z';

  it('should map a single heart rate signal', () => {
    const signal: HealthSignal = {
      timestamp,
      source: 'wearable',
      heartRate: 75
    };

    const observations = ObservationMapper.toFHIR(signal, patientId);

    expect(observations).toHaveLength(1);
    const obs = observations[0];
    
    expect(obs.resourceType).toBe('Observation');
    expect(obs.status).toBe('final');
    expect(obs.subject).toEqual({ reference: `Patient/${patientId}` });
    expect(obs.effectiveDateTime).toBe(timestamp);
    
    // Check Code
    expect(obs.code.coding).toHaveLength(1);
    expect(obs.code.coding![0].system).toBe('http://loinc.org');
    expect(obs.code.coding![0].code).toBe('8867-4');
    
    // Check Value
    expect(obs.valueQuantity).toEqual({
      value: 75,
      unit: '/min',
      system: 'http://unitsofmeasure.org',
      code: '/min'
    });
  });

  it('should map multiple signals (BP + HR)', () => {
    const signal: HealthSignal = {
      timestamp,
      source: 'manual',
      systolicBP: 120,
      diastolicBP: 80,
      heartRate: 70
    };

    const observations = ObservationMapper.toFHIR(signal, patientId);

    expect(observations).toHaveLength(3);
    
    // Helper to find observation by code
    const findObs = (code: string) => 
      observations.find(o => o.code.coding?.[0].code === code);

    const sbp = findObs('8480-6');
    const dbp = findObs('8462-4');
    const hr = findObs('8867-4');

    expect(sbp).toBeDefined();
    expect(sbp!.valueQuantity!.value).toBe(120);
    expect(sbp!.valueQuantity!.unit).toBe('mmHg');

    expect(dbp).toBeDefined();
    expect(dbp!.valueQuantity!.value).toBe(80);
    expect(dbp!.valueQuantity!.unit).toBe('mmHg');

    expect(hr).toBeDefined();
    expect(hr!.valueQuantity!.value).toBe(70);
  });

  it('should map SpO2', () => {
    const signal: HealthSignal = {
      timestamp,
      source: 'wearable',
      spo2: 98
    };

    const observations = ObservationMapper.toFHIR(signal, patientId);
    expect(observations).toHaveLength(1);
    expect(observations[0].code.coding![0].code).toBe('2708-6');
    expect(observations[0].valueQuantity!.unit).toBe('%');
    expect(observations[0].valueQuantity!.code).toBe('%');
  });

  it('should map Blood Glucose', () => {
    const signal: HealthSignal = {
      timestamp,
      source: 'manual',
      bloodGlucose: 100
    };

    const observations = ObservationMapper.toFHIR(signal, patientId);
    expect(observations).toHaveLength(1);
    expect(observations[0].code.coding![0].code).toBe('2339-0');
    expect(observations[0].valueQuantity!.unit).toBe('mg/dL');
  });

  it('should map Blood Lipid', () => {
    const signal: HealthSignal = {
      timestamp,
      source: 'hospital',
      bloodLipid: 180
    };

    const observations = ObservationMapper.toFHIR(signal, patientId);
    expect(observations).toHaveLength(1);
    expect(observations[0].code.coding![0].code).toBe('2093-3');
    expect(observations[0].valueQuantity!.unit).toBe('mg/dL');
  });

  it('should return empty array if no values present', () => {
    const signal: HealthSignal = {
      timestamp,
      source: 'manual'
    };
    // Technically HealthSignal types might allow this if all optionals are undefined
    const observations = ObservationMapper.toFHIR(signal, patientId);
    expect(observations).toHaveLength(0);
  });
});
