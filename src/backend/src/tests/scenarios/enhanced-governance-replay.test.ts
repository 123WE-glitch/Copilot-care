import { AgentBase } from '../../agents/AgentBase';
import { CardiologyAgent } from '../../agents/CardiologyAgent';
import { GPAgent } from '../../agents/GPAgent';
import { MetabolicAgent } from '../../agents/MetabolicAgent';
import { SafetyAgent } from '../../agents/SafetyAgent';
import { DebateEngine } from '../../core/DebateEngine';
import {
  evaluateKnowledgeRelease,
  GovernanceIndicator,
  KnowledgeSnapshot,
} from '../../infrastructure/governance/KnowledgeVersionGovernor';
import { AgentOpinion, PatientProfile } from '@copilot-care/shared/types';

type ScriptedOpinion = Omit<AgentOpinion, 'agentId' | 'agentName' | 'role'>;

class ScriptedAgent extends AgentBase {
  private readonly scripted: ScriptedOpinion;

  constructor(
    id: string,
    name: string,
    role: AgentOpinion['role'],
    scripted: ScriptedOpinion,
  ) {
    super(id, name, role);
    this.scripted = scripted;
  }

  public async think(
    _profile: PatientProfile,
    _context: string,
  ): Promise<AgentOpinion> {
    return {
      agentId: this.id,
      agentName: this.name,
      role: this.role,
      ...this.scripted,
    };
  }
}

function createBaselineProfile(patientId: string): PatientProfile {
  return {
    patientId,
    age: 59,
    sex: 'female',
    chronicDiseases: ['Hypertension', 'Diabetes'],
    medicationHistory: ['metformin'],
    vitals: {
      systolicBP: 156,
      diastolicBP: 96,
    },
    symptoms: ['fatigue', 'thirst'],
  };
}

describe('Enhanced Governance Replay - T-007 to T-010', () => {
  it('T-007 baseline guard should trigger conservative escalation on conflict', async () => {
    const engine = new DebateEngine([
      new ScriptedAgent('cardio_t007', 'Cardio-T007', 'Specialist', {
        riskLevel: 'L3',
        confidence: 0.93,
        reasoning: 'high-risk signal from specialist perspective',
        citations: ['SPEC-GDL-007'],
        actions: ['urgent offline escalation'],
      }),
      new ScriptedAgent('gp_t007', 'GP-T007', 'Generalist', {
        riskLevel: 'L0',
        confidence: 0.84,
        reasoning: 'conservative monitor-first path',
        citations: ['GP-GDL-007'],
        actions: ['monitor and follow-up'],
      }),
      new ScriptedAgent('meta_t007', 'Meta-T007', 'Metabolic', {
        riskLevel: 'L0',
        confidence: 0.82,
        reasoning: 'metabolic risk currently stable',
        citations: ['META-GDL-007'],
        actions: ['observe and lifestyle management'],
      }),
      new ScriptedAgent('safe_t007', 'Safety-T007', 'Safety', {
        riskLevel: 'L3',
        confidence: 0.95,
        reasoning: 'safety-first escalation under severe disagreement',
        citations: ['SAFE-GDL-007'],
        actions: ['escalate to offline'],
      }),
    ]);

    const result = await engine.runSession(createBaselineProfile('t-007'));

    expect(result.status).toBe('ESCALATE_TO_OFFLINE');
    expect(result.errorCode).toBe('ERR_ESCALATE_TO_OFFLINE');
    expect(result.rounds.length).toBe(1);
    expect(result.rounds[0].dissentBand).toBe('ESCALATE');
    expect(result.auditTrail.some((event) => event.phase === 'DI_CALCULATION')).toBe(
      true,
    );
    expect(result.auditTrail.some((event) => event.phase === 'ARBITRATION')).toBe(
      true,
    );
  });

  it('T-008 guideline evidence path should keep citations and guideline provenance', async () => {
    const engine = new DebateEngine([
      new CardiologyAgent(),
      new GPAgent(),
      new MetabolicAgent(),
      new SafetyAgent(),
    ]);

    const result = await engine.runSession(createBaselineProfile('t-008'));

    expect(result.status).toBe('OUTPUT');
    expect(result.finalConsensus).toBeDefined();
    expect(result.finalConsensus?.citations.length).toBeGreaterThan(0);
    expect(result.finalConsensus?.actions.length).toBeGreaterThan(0);

    const arbitrationEvents = result.auditTrail.filter(
      (event) => event.phase === 'ARBITRATION',
    );
    expect(arbitrationEvents.length).toBeGreaterThan(0);
    expect(
      arbitrationEvents.some((event) =>
        (event.provenance ?? []).some(
          (item) =>
            item.referenceType === 'guideline' &&
            item.referenceId === 'DI_THRESHOLDS',
        ),
      ),
    ).toBe(true);
  });

  it('T-009 low-confidence route should abstain with explicit error code', async () => {
    const engine = new DebateEngine([
      new ScriptedAgent('cardio_t009', 'Cardio-T009', 'Specialist', {
        riskLevel: 'L1',
        confidence: 0.55,
        reasoning: 'low confidence specialist view',
        citations: [],
        actions: ['collect more data'],
      }),
      new ScriptedAgent('gp_t009', 'GP-T009', 'Generalist', {
        riskLevel: 'L1',
        confidence: 0.51,
        reasoning: 'low confidence generalist view',
        citations: [],
        actions: ['collect more data'],
      }),
      new ScriptedAgent('meta_t009', 'Meta-T009', 'Metabolic', {
        riskLevel: 'L1',
        confidence: 0.52,
        reasoning: 'low confidence metabolic view',
        citations: [],
        actions: ['collect more data'],
      }),
      new ScriptedAgent('safe_t009', 'Safety-T009', 'Safety', {
        riskLevel: 'L1',
        confidence: 0.53,
        reasoning: 'low confidence safety view',
        citations: [],
        actions: ['collect more data'],
      }),
    ]);

    const result = await engine.runSession(createBaselineProfile('t-009'));

    expect(result.status).toBe('ABSTAIN');
    expect(result.errorCode).toBe('ERR_LOW_CONFIDENCE_ABSTAIN');
    expect(result.rounds.length).toBe(1);
    expect(result.finalConsensus).toBeUndefined();
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('T-010 knowledge-version governance should rollback when key metric drifts', () => {
    const baseline: KnowledgeSnapshot = {
      version: 'v1.0',
      rulesetId: 'rules-2026-02-10',
      capturedAt: '2026-02-10T00:00:00.000Z',
    };
    const candidate: KnowledgeSnapshot = {
      version: 'v1.1',
      rulesetId: 'rules-2026-02-21',
      capturedAt: '2026-02-21T00:00:00.000Z',
    };
    const indicators: GovernanceIndicator[] = [
      {
        id: 'highRiskRecall',
        value: 0.82,
        threshold: 0.9,
        thresholdType: 'min',
      },
      {
        id: 'averageLatencyMs',
        value: 680,
        threshold: 120000,
        thresholdType: 'max',
      },
    ];

    const decision = evaluateKnowledgeRelease({
      baseline,
      candidate,
      indicators,
      reason: 'continuous key-metric anomaly after v1.1 activation',
      now: () => new Date('2026-02-21T08:00:00.000Z'),
    });

    expect(decision.decision).toBe('ROLLBACK_TO_BASELINE');
    expect(decision.activeSnapshot.version).toBe('v1.0');
    expect(decision.breachedIndicatorIds).toEqual(['highRiskRecall']);
    expect(decision.rollbackRecord).toBeDefined();
    expect(decision.rollbackRecord?.fromVersion).toBe('v1.1');
    expect(decision.rollbackRecord?.toVersion).toBe('v1.0');
    expect(decision.rollbackRecord?.triggeredBy).toEqual(['highRiskRecall']);
  });
});
