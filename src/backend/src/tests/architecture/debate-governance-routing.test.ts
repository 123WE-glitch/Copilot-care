import { PatientProfile } from '@copilot-care/shared/types';
import { CardiologyAgent } from '../../agents/CardiologyAgent';
import { GPAgent } from '../../agents/GPAgent';
import { MetabolicAgent } from '../../agents/MetabolicAgent';
import { SafetyAgent } from '../../agents/SafetyAgent';
import { DebateEngine } from '../../core/DebateEngine';

function createEngine(): DebateEngine {
  return new DebateEngine([
    new CardiologyAgent(),
    new GPAgent(),
    new MetabolicAgent(),
    new SafetyAgent(),
  ]);
}

describe('Architecture Smoke - debate governance routing', () => {
  it('short-circuits to offline escalation on red-flag input', async () => {
    const engine = createEngine();
    const profile: PatientProfile = {
      patientId: 'routing-redflag-001',
      age: 66,
      sex: 'male',
      chronicDiseases: ['Hypertension'],
      medicationHistory: ['none'],
      vitals: {
        systolicBP: 184,
        diastolicBP: 112,
      },
      symptoms: ['chest pain'],
    };

    const result = await engine.runSession(profile);

    expect(result.status).toBe('ESCALATE_TO_OFFLINE');
    expect(result.errorCode).toBe('ERR_ESCALATE_TO_OFFLINE');
    expect(result.rounds.length).toBe(0);
  });

  it('routes deep dissent profiles through bounded deep debate path', async () => {
    const engine = createEngine();
    const profile: PatientProfile = {
      patientId: 'routing-deep-001',
      age: 58,
      sex: 'female',
      chronicDiseases: ['Hypertension'],
      medicationHistory: ['amlodipine'],
      vitals: {
        systolicBP: 132,
        diastolicBP: 84,
      },
      symptoms: ['stable'],
    };

    const result = await engine.runSession(profile);

    expect(result.status).toBe('ABSTAIN');
    expect(result.errorCode).toBe('ERR_CONFLICT_UNRESOLVED');
    expect(result.rounds.length).toBe(3);
    expect(result.rounds.every((round) => round.dissentBand === 'DEEP_DEBATE')).toBe(
      true,
    );
  });

  it('records audit trail across evaluation, arbitration and output phases', async () => {
    const engine = createEngine();
    const profile: PatientProfile = {
      patientId: 'routing-audit-001',
      age: 55,
      sex: 'male',
      chronicDiseases: ['Hypertension', 'Diabetes'],
      medicationHistory: ['metformin'],
      vitals: {
        systolicBP: 150,
        diastolicBP: 96,
      },
      symptoms: ['fatigue'],
    };

    const result = await engine.runSession(profile);
    const phases = new Set(result.auditTrail.map((event) => event.phase));

    expect(phases.has('RISK_EVALUATION')).toBe(true);
    expect(phases.has('DI_CALCULATION')).toBe(true);
    expect(phases.has('ARBITRATION')).toBe(true);
    expect(phases.has('OUTPUT') || phases.has('ESCALATION')).toBe(true);
  });
});