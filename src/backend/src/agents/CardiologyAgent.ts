import { AgentBase } from './AgentBase';
import { AgentOpinion, PatientProfile } from '@copilot-care/shared/types';
import { ClinicalLLMClient } from '../llm/types';

export class CardiologyAgent extends AgentBase {
  private readonly llmClient: ClinicalLLMClient | null;

  constructor(llmClient?: ClinicalLLMClient | null) {
    super('cardio_01', '心内专科代理', 'Specialist');
    this.llmClient = llmClient ?? null;
  }

  private buildFallbackOpinion(profile: PatientProfile): AgentOpinion {
    const hasHighBP = profile.chronicDiseases.includes('Hypertension');

    return {
      agentId: this.id,
      agentName: this.name,
      role: this.role,
      riskLevel: hasHighBP ? 'L2' : 'L0',
      confidence: 0.9,
      reasoning: '存在高血压相关风险因素，建议加强监测并在风险升高时及时升级处置。',
      citations: ['高血压管理指南2024'],
      actions: [
        '建议1-2周内安排线下临床复评',
        '建议每日记录血压并观察变化趋势',
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
        focus: '心血管风险分诊与升级判断',
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
