import { AgentBase } from './AgentBase';
import { AgentOpinion, PatientProfile } from '@copilot-care/shared/types';
import { ClinicalLLMClient } from '../llm/types';

function normalizeDiseases(profile: PatientProfile): string[] {
  return profile.chronicDiseases.map((item) => item.toLowerCase());
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function detectMetabolicSignals(profile: PatientProfile): {
  hasDiabetes: boolean;
  hasPrediabetes: boolean;
  hasDyslipidemia: boolean;
  hasObesity: boolean;
  symptomSignal: boolean;
  bpSignal: boolean;
} {
  const diseases = normalizeDiseases(profile);
  const symptoms = profile.symptoms ?? [];

  const hasDiabetes = diseases.some((disease) =>
    hasAnyKeyword(disease, ['diabetes', '2型糖尿病', '糖尿病']),
  );
  const hasPrediabetes = diseases.some((disease) =>
    hasAnyKeyword(disease, ['prediabetes', '糖耐量异常', '糖调节受损']),
  );
  const hasDyslipidemia = diseases.some((disease) =>
    hasAnyKeyword(disease, ['dyslipidemia', 'hyperlipidemia', '血脂异常', '高脂血症']),
  );
  const hasObesity = diseases.some((disease) =>
    hasAnyKeyword(disease, ['obesity', 'overweight', '肥胖', '超重']),
  );

  const symptomSignal = symptoms.some((symptom) =>
    hasAnyKeyword(symptom, [
      '口渴',
      '多饮',
      '多尿',
      '乏力',
      '体重下降',
      'polydipsia',
      'polyuria',
      'weight loss',
      'fatigue',
    ]),
  );

  const bpSignal =
    (profile.vitals?.systolicBP ?? 0) >= 140 ||
    (profile.vitals?.diastolicBP ?? 0) >= 90;

  return {
    hasDiabetes,
    hasPrediabetes,
    hasDyslipidemia,
    hasObesity,
    symptomSignal,
    bpSignal,
  };
}

export class MetabolicAgent extends AgentBase {
  private readonly llmClient: ClinicalLLMClient | null;

  constructor(llmClient?: ClinicalLLMClient | null) {
    super('metabolic_01', '代谢专科代理', 'Metabolic');
    this.llmClient = llmClient ?? null;
  }

  private buildFallbackOpinion(profile: PatientProfile): AgentOpinion {
    const signals = detectMetabolicSignals(profile);
    const riskFactorCount = [
      signals.hasDiabetes,
      signals.hasPrediabetes,
      signals.hasDyslipidemia,
      signals.hasObesity,
      signals.symptomSignal,
      signals.bpSignal,
    ].filter(Boolean).length;

    const riskLevel: AgentOpinion['riskLevel'] =
      signals.hasDiabetes || riskFactorCount >= 3 ? 'L2' : riskFactorCount >= 1 ? 'L1' : 'L0';

    const reasoning =
      riskLevel === 'L2'
        ? '代谢危险因素较集中，建议尽快进行线下复评并完善血糖血脂等指标检查。'
        : riskLevel === 'L1'
          ? '存在早期代谢风险信号，建议加强随访并尽快完成代谢相关基础筛查。'
          : '暂未见明确代谢高风险信号，可继续常规健康管理并动态观察。';

    return {
      agentId: this.id,
      agentName: this.name,
      role: this.role,
      riskLevel,
      confidence: 0.86,
      reasoning,
      citations: ['代谢综合征与慢病管理实践建议'],
      actions: [
        '建议近期完善空腹血糖、糖化血红蛋白、血脂与肾功能检查',
        '建议记录体重、腰围、饮食与运动情况，形成随访基线',
        '若出现明显口渴多尿、持续乏力或体重快速变化，建议尽快线下就医',
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
        focus: '代谢风险分层、慢病随访节奏与生活方式干预建议',
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
