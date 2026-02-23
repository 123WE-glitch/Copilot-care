import {
  AgentOpinion,
  ExplainableReport,
  StructuredTriageResult,
  TriageRoutingInfo,
} from '@copilot-care/shared/types';

export interface BuildExplainableReportInput {
  triageResult: StructuredTriageResult;
  finalConsensus?: AgentOpinion;
  routing?: TriageRoutingInfo;
  ruleEvidence: string[];
  additionalEvidence: string[];
}

export class ExplainableReportService {
  public build(input: BuildExplainableReportInput): ExplainableReport {
    const triageLevel = input.triageResult.triageLevel;
    const conclusion =
      `分诊等级：${triageLevel}；去向：${input.triageResult.destination}；` +
      `建议 ${input.triageResult.followupDays} 天内完成下一次随访。`;

    const evidence = [
      ...(input.finalConsensus?.citations ?? []),
      ...input.additionalEvidence,
    ].filter(Boolean);

    const basis = [
      ...(input.routing?.reasons ?? []),
      ...input.ruleEvidence,
      ...(input.finalConsensus?.reasoning ? [input.finalConsensus.reasoning] : []),
    ];

    const actions = [
      ...input.triageResult.educationAdvice,
      ...(input.finalConsensus?.actions ?? []),
    ];

    return {
      conclusion,
      evidence: [...new Set(evidence)],
      basis: [...new Set(basis)],
      actions: [...new Set(actions)],
      counterfactual: [
        '若未执行建议，风险等级可能在后续随访中上移。',
        '若按建议执行并持续监测，可降低异常未被及时识别的概率。',
      ],
    };
  }
}
