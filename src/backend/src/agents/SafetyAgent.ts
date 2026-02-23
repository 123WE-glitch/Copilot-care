import { AgentBase } from './AgentBase';
import { AgentOpinion, PatientProfile } from '@copilot-care/shared/types';
import { ClinicalLLMClient } from '../llm/types';

function hasRedFlag(profile: PatientProfile): boolean {
  const symptoms = profile.symptoms ?? [];
  const redFlagTerms = [
    '胸痛',
    '呼吸困难',
    '晕厥',
    '剧烈头痛',
    'chest pain',
    'shortness of breath',
    'syncope',
    'severe headache',
  ];

  const symptomFlag = symptoms.some((symptom) => {
    const normalized = symptom.toLowerCase();
    return redFlagTerms.some((term) => normalized.includes(term.toLowerCase()));
  });

  const bpFlag =
    (profile.vitals?.systolicBP ?? 0) >= 180 ||
    (profile.vitals?.diastolicBP ?? 0) >= 110;

  return symptomFlag || bpFlag;
}

export class SafetyAgent extends AgentBase {
  private readonly llmClient: ClinicalLLMClient | null;

  constructor(llmClient?: ClinicalLLMClient | null) {
    super('safety_01', '安全审查代理', 'Safety');
    this.llmClient = llmClient ?? null;
  }

  private buildFallbackOpinion(profile: PatientProfile): AgentOpinion {
    if (hasRedFlag(profile)) {
      return {
        agentId: this.id,
        agentName: this.name,
        role: this.role,
        riskLevel: 'L3',
        confidence: 0.95,
        reasoning: '检测到红旗信号或极高血压阈值，需优先确保安全并立即线下升级。',
        citations: ['安全红旗规则集'],
        actions: [
          '建议立即线下急诊或紧急门诊评估',
          '停止线上继续诊断，优先保障患者安全',
        ],
      };
    }

    return {
      agentId: this.id,
      agentName: this.name,
      role: this.role,
      riskLevel: 'L1',
      confidence: 0.82,
      reasoning: '未检出明确红旗信号，建议保持保守随访与风险监测。',
      citations: ['基础分诊安全边界规则'],
      actions: [
        '继续观察症状变化并定期复查',
        '出现胸痛、晕厥或呼吸困难时立即线下就医',
      ],
    };
  }

  public async think(
    profile: PatientProfile,
    context: string,
  ): Promise<AgentOpinion> {
    const fallback = this.buildFallbackOpinion(profile);
    if (!this.llmClient) {
      return fallback;
    }

    try {
      const llmOpinion = await this.llmClient.generateOpinion({
        role: this.role,
        agentName: this.name,
        focus: '安全红旗识别、风险边界审查与保守升级建议',
        profile,
        context,
      });

      if (!llmOpinion) {
        return fallback;
      }

      return {
        agentId: this.id,
        agentName: this.name,
        role: this.role,
        ...llmOpinion,
      };
    } catch {
      return fallback;
    }
  }
}
