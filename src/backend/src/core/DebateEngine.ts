import { AgentBase } from '../agents/AgentBase';
import {
  AgentOpinion,
  AuditEvent,
  DebateResult,
  DebateRound,
  DissentThresholdBand,
  ErrorCode,
  PatientProfile,
} from '@copilot-care/shared/types';

export interface DebateRuntimeHooks {
  onRoundStarted?: (roundNumber: number) => void;
  onRoundCompleted?: (round: DebateRound) => void;
}

export class DebateEngine {
  private agents: AgentBase[];
  private maxRounds: number = 3;
  private readonly alpha: number = 0.7;
  private readonly beta: number = 0.3;
  private readonly thresholds = {
    consensus: 0.2,
    lightDebate: 0.4,
    deepDebate: 0.7,
  };

  constructor(
    agents: AgentBase[],
    options?: {
      maxRounds?: number;
    },
  ) {
    this.agents = agents;
    if (
      options &&
      typeof options.maxRounds === 'number' &&
      Number.isFinite(options.maxRounds) &&
      options.maxRounds > 0
    ) {
      this.maxRounds = Math.floor(options.maxRounds);
    }
  }

  private getRiskNumeric(level: AgentOpinion['riskLevel']): number {
    const mapping: Record<AgentOpinion['riskLevel'], number> = {
      L0: 0,
      L1: 1,
      L2: 2,
      L3: 3,
    };
    return mapping[level];
  }

  private normalize(value: number, min: number, max: number): number {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return min;
    }
    return Math.min(max, Math.max(min, value));
  }

  // Disagreement term from risk-level dispersion, normalized to [0, 1].
  private calculateDisagreement(opinions: AgentOpinion[]): number {
    if (opinions.length === 0) {
      return 0;
    }

    const values = opinions.map((opinion) => this.getRiskNumeric(opinion.riskLevel));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // For a 0..3 bounded variable, 1.5 is the practical maximum std-dev.
    return this.normalize(stdDev / 1.5, 0, 1);
  }

  // Clinical significance term from action-direction conflict and boundary spread.
  private calculateClinicalSignificance(opinions: AgentOpinion[]): number {
    if (opinions.length === 0) {
      return 0;
    }

    const values = opinions.map((opinion) => this.getRiskNumeric(opinion.riskLevel));
    const spread = Math.max(...values) - Math.min(...values);
    const hasL3 = values.some((value) => value >= 3);

    const escalationPattern = /(urgent|escalat|offline|referr|emergency|线下|上转|升级|急诊|尽快就医)/i;
    const conservativePattern = /(monitor|follow-up|lifestyle|observe|随访|观察|生活方式|复查)/i;

    const escalationVotes = opinions.some((opinion) =>
      opinion.actions.some((action) => escalationPattern.test(action)),
    );
    const conservativeVotes = opinions.some((opinion) =>
      opinion.actions.some((action) => conservativePattern.test(action)),
    );
    const directionConflict = escalationVotes && conservativeVotes;

    let significance = 0;
    if (spread >= 2) {
      significance += 0.5;
    }
    if (directionConflict) {
      significance += 0.3;
    }
    if (hasL3) {
      significance += 0.2;
    }

    return this.normalize(significance, 0, 1);
  }

  // Dissent Index = alpha * disagreement + beta * clinical significance.
  private calculateDissent(opinions: AgentOpinion[]): {
    index: number;
    disagreement: number;
    clinicalSignificance: number;
  } {
    const disagreement = this.calculateDisagreement(opinions);
    const clinicalSignificance = this.calculateClinicalSignificance(opinions);
    const index = this.normalize(
      this.alpha * disagreement + this.beta * clinicalSignificance,
      0,
      1,
    );

    return { index, disagreement, clinicalSignificance };
  }

  private getBand(dissentIndex: number): DissentThresholdBand {
    if (dissentIndex < this.thresholds.consensus) {
      return 'CONSENSUS';
    }
    if (dissentIndex < this.thresholds.lightDebate) {
      return 'LIGHT_DEBATE';
    }
    if (dissentIndex < this.thresholds.deepDebate) {
      return 'DEEP_DEBATE';
    }
    return 'ESCALATE';
  }

  private createAuditEvent(
    sessionId: string,
    phase: AuditEvent['phase'],
    eventType: AuditEvent['eventType'],
    details: string,
    provenance: AuditEvent['provenance'] = [],
  ): AuditEvent {
    return {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      timestamp: new Date().toISOString(),
      phase,
      eventType,
      details,
      provenance,
    };
  }

  private selectConsensus(opinions: AgentOpinion[]): AgentOpinion | undefined {
    if (opinions.length === 0) {
      return undefined;
    }

    const scored = opinions.map((opinion) => {
      const guidelineFit = opinion.citations.length > 0 ? 1 : 0.5;
      const confidenceScore = this.normalize(opinion.confidence, 0, 1);
      const safetyPriority = this.normalize(this.getRiskNumeric(opinion.riskLevel) / 3, 0, 1);
      const consensusScore =
        0.5 * guidelineFit + 0.3 * confidenceScore + 0.2 * safetyPriority;
      return { opinion, consensusScore };
    });

    scored.sort((a, b) => b.consensusScore - a.consensusScore);
    return scored[0].opinion;
  }

  private validateInput(profile: PatientProfile): ErrorCode | undefined {
    if (!profile.patientId || !profile.sex || !Number.isFinite(profile.age)) {
      return 'ERR_MISSING_REQUIRED_DATA';
    }
    if (!Array.isArray(profile.chronicDiseases) || !Array.isArray(profile.medicationHistory)) {
      return 'ERR_MISSING_REQUIRED_DATA';
    }
    if (
      profile.vitals?.systolicBP !== undefined &&
      profile.vitals?.diastolicBP !== undefined &&
      profile.vitals.systolicBP <= profile.vitals.diastolicBP
    ) {
      return 'ERR_INVALID_VITAL_SIGN';
    }
    return undefined;
  }

  private hasRedFlag(profile: PatientProfile): boolean {
    const symptoms = profile.symptoms ?? [];
    const redFlagTerms = [
      'chest pain',
      'severe headache',
      'syncope',
      'shortness of breath',
      'neurological deficit',
      '胸痛',
      '剧烈头痛',
      '晕厥',
      '呼吸困难',
      '神经功能缺损',
    ];
    const symptomFlag = symptoms.some((symptom) =>
      redFlagTerms.some((term) => symptom.toLowerCase().includes(term)),
    );
    const bpFlag =
      (profile.vitals?.systolicBP ?? 0) >= 180 || (profile.vitals?.diastolicBP ?? 0) >= 110;
    return symptomFlag || bpFlag;
  }

  private buildInitialResult(
    sessionId: string,
    status: DebateResult['status'],
    errorCode: ErrorCode,
    notes: string,
  ): DebateResult {
    const auditTrail = [
      this.createAuditEvent(
        sessionId,
        'INPUT_VALIDATION',
        'ERROR_RAISED',
        `${errorCode}: ${notes}`,
      ),
    ];

    return {
      sessionId,
      status,
      rounds: [],
      dissentIndexHistory: [],
      errorCode,
      notes: [notes],
      auditTrail,
    };
  }

  public async runSession(
    profile: PatientProfile,
    sessionId: string = `sess_${Date.now()}`,
    hooks?: DebateRuntimeHooks,
  ): Promise<DebateResult> {
    const history: DebateRound[] = [];
    const auditTrail: AuditEvent[] = [];
    const notes: string[] = [];
    const validationError = this.validateInput(profile);
    if (validationError) {
      return this.buildInitialResult(
        sessionId,
        'ERROR',
        validationError,
        '输入校验失败。',
      );
    }

    if (this.hasRedFlag(profile)) {
      return this.buildInitialResult(
        sessionId,
        'ESCALATE_TO_OFFLINE',
        'ERR_ESCALATE_TO_OFFLINE',
        '检测到红旗信号，建议立即转线下就医。',
      );
    }

    let context = '初始评估';
    const dissentIndexHistory: number[] = [];

    for (let round = 1; round <= this.maxRounds; round++) {
      hooks?.onRoundStarted?.(round);
      auditTrail.push(
        this.createAuditEvent(
          sessionId,
          'RISK_EVALUATION',
          'ROUND_STARTED',
          `第${round}轮会诊开始。`,
        ),
      );

      // 1. Parallel Thinking
      const opinions = await Promise.all(
        this.agents.map((agent) => agent.think(profile, context)),
      );

      // 2. Calculate Dissent
      const dissent = this.calculateDissent(opinions);
      const band = this.getBand(dissent.index);
      dissentIndexHistory.push(dissent.index);

      auditTrail.push(
        this.createAuditEvent(
          sessionId,
          'DI_CALCULATION',
          'ROUND_COMPLETED',
          `第${round}轮：分歧指数=${dissent.index.toFixed(3)}，风险分散=${dissent.disagreement.toFixed(3)}，临床冲突=${dissent.clinicalSignificance.toFixed(3)}。`,
          [
            {
              referenceType: 'rule',
              referenceId: 'DI_ALPHA_BETA',
              description: `alpha=${this.alpha}, beta=${this.beta}`,
            },
          ],
        ),
      );

      const roundResult: DebateRound = {
        roundNumber: round,
        opinions,
        dissentIndex: dissent.index,
        dissentBand: band,
        moderatorSummary: `分歧等级=${band}，分歧指数=${dissent.index.toFixed(3)}`,
      };
      history.push(roundResult);
      hooks?.onRoundCompleted?.(roundResult);

      auditTrail.push(
        this.createAuditEvent(
          sessionId,
          'ARBITRATION',
          'BAND_SELECTED',
          `第${round}轮判定分歧等级为 ${band}。`,
          [
            {
              referenceType: 'guideline',
              referenceId: 'DI_THRESHOLDS',
              description: '<0.2 consensus, 0.2-0.4 light, 0.4-0.7 deep, >=0.7 escalate',
            },
          ],
        ),
      );

      const lowConfidence = opinions.every((opinion) => opinion.confidence < 0.7);
      if (lowConfidence) {
        notes.push('全部意见置信度低于0.7阈值。');
        return {
          sessionId,
          status: 'ABSTAIN',
          rounds: history,
          finalConsensus: undefined,
          dissentIndexHistory,
          errorCode: 'ERR_LOW_CONFIDENCE_ABSTAIN',
          notes,
          auditTrail,
        };
      }

      if (band === 'CONSENSUS') {
        const finalConsensus = this.selectConsensus(opinions);
        auditTrail.push(
          this.createAuditEvent(
            sessionId,
            'OUTPUT',
            'FINALIZED',
            `第${round}轮达成共识。`,
          ),
        );
        return {
          sessionId,
          status: 'OUTPUT',
          rounds: history,
          finalConsensus,
          dissentIndexHistory,
          notes,
          auditTrail,
        };
      }

      if (band === 'LIGHT_DEBATE' && round >= 2) {
        const finalConsensus = this.selectConsensus(opinions);
        notes.push('轻度分歧已在一轮辩论后收敛。');
        auditTrail.push(
          this.createAuditEvent(
            sessionId,
            'OUTPUT',
            'FINALIZED',
            `第${round}轮完成轻度分歧收敛。`,
          ),
        );
        return {
          sessionId,
          status: 'OUTPUT',
          rounds: history,
          finalConsensus,
          dissentIndexHistory,
          notes,
          auditTrail,
        };
      }

      if (band === 'ESCALATE') {
        notes.push('检测到高分歧，触发保守线下升级。');
        return {
          sessionId,
          status: 'ESCALATE_TO_OFFLINE',
          rounds: history,
          finalConsensus: undefined,
          dissentIndexHistory,
          errorCode: 'ERR_ESCALATE_TO_OFFLINE',
          notes,
          auditTrail,
        };
      }

      // 3. Update context for next round.
      context = `上一轮存在冲突意见：${JSON.stringify(opinions)}`;
    }

    notes.push('达到最大轮次后冲突仍未收敛。');
    auditTrail.push(
      this.createAuditEvent(
        sessionId,
        'ESCALATION',
        'ERROR_RAISED',
        '达到最大轮次仍未达成共识。',
      ),
    );
    return {
      sessionId,
      status: 'ABSTAIN',
      rounds: history,
      finalConsensus: undefined,
      dissentIndexHistory,
      errorCode: 'ERR_CONFLICT_UNRESOLVED',
      notes,
      auditTrail,
    };
  }

  public async runDebate(profile: PatientProfile): Promise<DebateRound[]> {
    const result = await this.runSession(profile);
    return result.rounds;
  }
}
