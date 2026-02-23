import { CardiologyAgent } from '../../agents/CardiologyAgent';
import { GPAgent } from '../../agents/GPAgent';
import { DebateEngine } from '../../core/DebateEngine';

describe('Architecture Smoke - debate orchestration', () => {
  it('runs main orchestration flow and returns a typed status', async () => {
    const engine = new DebateEngine([new CardiologyAgent(), new GPAgent()]);
    const result = await engine.runSession({
      patientId: 'arch-smoke-001',
      age: 56,
      sex: 'male',
      chronicDiseases: ['Hypertension'],
      medicationHistory: ['none'],
      vitals: {
        systolicBP: 150,
        diastolicBP: 95,
      },
      symptoms: ['fatigue'],
    });

    expect(['OUTPUT', 'ESCALATE_TO_OFFLINE', 'ABSTAIN', 'ERROR']).toContain(
      result.status,
    );
    expect(result.auditTrail.length).toBeGreaterThan(0);
  });

  it('returns validation error when required profile fields are missing', async () => {
    const engine = new DebateEngine([new CardiologyAgent(), new GPAgent()]);
    const result = await engine.runSession({
      age: 56,
      sex: 'male',
      chronicDiseases: [],
      medicationHistory: [],
    } as any);

    expect(result.status).toBe('ERROR');
    expect(result.errorCode).toBe('ERR_MISSING_REQUIRED_DATA');
  });

  it('forces offline escalation when red-flag symptoms are present', async () => {
    const engine = new DebateEngine([new CardiologyAgent(), new GPAgent()]);
    const result = await engine.runSession({
      patientId: 'arch-smoke-002',
      age: 64,
      sex: 'female',
      chronicDiseases: ['Hypertension'],
      medicationHistory: ['none'],
      symptoms: ['severe headache'],
    });

    expect(result.status).toBe('ESCALATE_TO_OFFLINE');
    expect(result.errorCode).toBe('ERR_ESCALATE_TO_OFFLINE');
  });
});
