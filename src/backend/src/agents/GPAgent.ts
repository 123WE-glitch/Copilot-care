import { AgentBase } from './AgentBase';
import { AgentOpinion, PatientProfile } from '@copilot-care/shared/types';
import { ClinicalLLMClient } from '../llm/types';

export class GPAgent extends AgentBase {
  private readonly llmClient: ClinicalLLMClient | null;

  constructor(llmClient?: ClinicalLLMClient | null) {
    super('gp_01', '全科会诊代理', 'Generalist');
    this.llmClient = llmClient ?? null;
  }

  private buildFallbackOpinion(): AgentOpinion {
    return {
      agentId: this.id,
      agentName: this.name,
      role: this.role,
      riskLevel: 'L1', // More conservative than Cardio
      confidence: 0.85,
      reasoning: '当前更像波动性血压升高，建议先观察趋势后再判断升级风险。',
      citations: ['全科分诊规范'],
      actions: [
        '建议进行24小时动态血压监测并随访',
        '建议低盐饮食与作息管理',
        '若症状加重或出现红旗信号，立即线下就医',
      ],
    };
  }

  public async think(
    profile: PatientProfile,
    context: string,
  ): Promise<AgentOpinion> {
    const fallback = this.buildFallbackOpinion();
    if (!this.llmClient) {
      return fallback;
    }

    try {
      const llmOpinion = await this.llmClient.generateOpinion({
        role: this.role,
        agentName: this.name,
        focus: '全科视角下的保守分诊与连续性管理',
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
