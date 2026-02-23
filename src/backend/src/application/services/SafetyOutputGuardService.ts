import {
  AgentOpinion,
  DebateResult,
  ExplainableReport,
  StructuredTriageResult,
  TriageRequest,
} from '@copilot-care/shared/types';

export interface SafetyOutputGuardInput {
  request: TriageRequest;
  debateResult: DebateResult;
  triageResult: StructuredTriageResult;
  explainableReport: ExplainableReport;
}

export interface SafetyOutputGuardOutcome {
  blocked: boolean;
  status: DebateResult['status'];
  errorCode?: DebateResult['errorCode'];
  triageResult: StructuredTriageResult;
  explainableReport: ExplainableReport;
  finalConsensus?: AgentOpinion;
  reviewDetail: string;
  notes: string[];
}

export interface SafetyOutputGuardConfig {
  selfHarmOrViolenceTerms: string[];
  promptInjectionTerms: string[];
  unsafeDirectiveTerms: string[];
}

const DEFAULT_SELF_HARM_OR_VIOLENCE_TERMS: string[] = [
  '自杀',
  '自残',
  '轻生',
  '伤害自己',
  '伤害他人',
  '杀人',
  'hurt myself',
  'kill myself',
  'suicide',
  'harm myself',
  'kill others',
  'homicide',
];

const DEFAULT_PROMPT_INJECTION_TERMS: string[] = [
  '忽略之前规则',
  '忽略以上规则',
  '忽略系统指令',
  '忽略系统规则',
  '越狱',
  'jailbreak',
  'ignore previous instructions',
  'ignore system instructions',
];

const DEFAULT_UNSAFE_DIRECTIVE_TERMS: string[] = [
  '立即服用',
  '自行服用',
  '自行用药',
  '开具处方',
  '调整剂量',
  '加量',
  '减量',
  '停药',
  '抗生素',
  '激素',
  'prescribe',
  'start taking',
  'increase dose',
  'decrease dose',
  'stop medication',
  'antibiotic',
  'steroid',
];

function escapeRegexTerm(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTerms(terms: string[] | undefined): string[] {
  if (!Array.isArray(terms)) {
    return [];
  }
  return terms
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function mergeTerms(defaultTerms: string[], overrideTerms?: string[]): string[] {
  const merged = [...defaultTerms, ...normalizeTerms(overrideTerms)];
  return [...new Set(merged)];
}

function buildPattern(terms: string[]): RegExp {
  if (terms.length === 0) {
    return /$^/;
  }
  const alternation = terms.map((term) => escapeRegexTerm(term)).join('|');
  return new RegExp(`(${alternation})`, 'i');
}

function joinTexts(items: Array<string | undefined>): string {
  return items
    .filter((item): item is string => typeof item === 'string')
    .join('\n')
    .trim();
}

function toEmergencyTriageResult(
  patientId: string,
  originalAdvice: string[],
): StructuredTriageResult {
  return {
    patientId,
    triageLevel: 'emergency',
    destination: '建议立即线下急诊/专科面诊',
    followupDays: 0,
    educationAdvice: [
      '线上系统仅提供分诊建议，不提供处方与确诊结论。',
      ...originalAdvice.slice(0, 2),
    ],
  };
}

function buildBlockedReport(
  reason: string,
  original: ExplainableReport,
): ExplainableReport {
  return {
    conclusion:
      '安全审校触发：检测到高风险或越界输出风险，已阻断线上建议并转为线下就医路径。',
    evidence: [...new Set(['SAFETY_OUTPUT_GUARD_V1', ...original.evidence])],
    basis: [...new Set([reason, ...original.basis])],
    actions: [
      '请立即前往线下急诊或专科门诊完成医生面诊评估。',
      '如出现胸痛、呼吸困难、意识变化等症状请立即呼叫急救。',
    ],
    counterfactual: original.counterfactual,
  };
}

function hasUnsafeRequestSignal(
  request: TriageRequest,
  pattern: RegExp,
): boolean {
  const requestText = joinTexts([
    request.symptomText,
    request.profile.chiefComplaint,
    ...(request.profile.symptoms ?? []),
  ]);
  return pattern.test(requestText);
}

function hasUnsafeOutputSignal(
  explainableReport: ExplainableReport,
  finalConsensus: AgentOpinion | undefined,
  promptInjectionPattern: RegExp,
  unsafeDirectivePattern: RegExp,
): boolean {
  const outputText = joinTexts([
    explainableReport.conclusion,
    ...explainableReport.actions,
    ...explainableReport.basis,
    finalConsensus?.reasoning,
    ...(finalConsensus?.actions ?? []),
  ]);
  return (
    promptInjectionPattern.test(outputText) ||
    unsafeDirectivePattern.test(outputText)
  );
}

export class SafetyOutputGuardService {
  private readonly selfHarmOrViolencePattern: RegExp;
  private readonly promptInjectionPattern: RegExp;
  private readonly unsafeDirectivePattern: RegExp;

  constructor(config?: Partial<SafetyOutputGuardConfig>) {
    const selfHarmTerms = mergeTerms(
      DEFAULT_SELF_HARM_OR_VIOLENCE_TERMS,
      config?.selfHarmOrViolenceTerms,
    );
    const promptInjectionTerms = mergeTerms(
      DEFAULT_PROMPT_INJECTION_TERMS,
      config?.promptInjectionTerms,
    );
    const unsafeDirectiveTerms = mergeTerms(
      DEFAULT_UNSAFE_DIRECTIVE_TERMS,
      config?.unsafeDirectiveTerms,
    );

    this.selfHarmOrViolencePattern = buildPattern(selfHarmTerms);
    this.promptInjectionPattern = buildPattern(promptInjectionTerms);
    this.unsafeDirectivePattern = buildPattern(unsafeDirectiveTerms);
  }

  public review(input: SafetyOutputGuardInput): SafetyOutputGuardOutcome {
    const unsafeRequest = hasUnsafeRequestSignal(
      input.request,
      this.selfHarmOrViolencePattern,
    );
    if (unsafeRequest) {
      return {
        blocked: true,
        status: 'ESCALATE_TO_OFFLINE',
        errorCode: 'ERR_ESCALATE_TO_OFFLINE',
        triageResult: toEmergencyTriageResult(
          input.triageResult.patientId,
          input.triageResult.educationAdvice,
        ),
        explainableReport: buildBlockedReport(
          '检测到自伤/他伤高风险语义',
          input.explainableReport,
        ),
        finalConsensus: undefined,
        reviewDetail: '安全审校触发高危语义，已阻断线上输出并执行线下上转。',
        notes: ['安全审校触发：检测到自伤/他伤高风险语义。'],
      };
    }

    const unsafeOutput =
      input.debateResult.status === 'OUTPUT' &&
      hasUnsafeOutputSignal(
        input.explainableReport,
        input.debateResult.finalConsensus,
        this.promptInjectionPattern,
        this.unsafeDirectivePattern,
      );
    if (unsafeOutput) {
      return {
        blocked: true,
        status: 'ESCALATE_TO_OFFLINE',
        errorCode: 'ERR_ADVERSARIAL_PROMPT_DETECTED',
        triageResult: toEmergencyTriageResult(
          input.triageResult.patientId,
          input.triageResult.educationAdvice,
        ),
        explainableReport: buildBlockedReport(
          '检测到可能导致用药/处置越界的高风险指令',
          input.explainableReport,
        ),
        finalConsensus: undefined,
        reviewDetail: '安全审校识别到越界处置指令，已阻断输出并转线下路径。',
        notes: ['安全审校触发：检测到越界处置指令。'],
      };
    }

    return {
      blocked: false,
      status: input.debateResult.status,
      errorCode: input.debateResult.errorCode,
      triageResult: input.triageResult,
      explainableReport: input.explainableReport,
      finalConsensus: input.debateResult.finalConsensus,
      reviewDetail: '安全复核通过',
      notes: ['安全审校通过：未发现越界输出风险。'],
    };
  }
}
