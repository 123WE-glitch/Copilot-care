"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyOutputGuardService = void 0;
var DEFAULT_SELF_HARM_OR_VIOLENCE_TERMS = [
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
var DEFAULT_PROMPT_INJECTION_TERMS = [
    '忽略之前规则',
    '忽略以上规则',
    '忽略系统指令',
    '忽略系统规则',
    '越狱',
    'jailbreak',
    'ignore previous instructions',
    'ignore system instructions',
];
var DEFAULT_UNSAFE_DIRECTIVE_TERMS = [
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
function escapeRegexTerm(term) {
    return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function normalizeTerms(terms) {
    if (!Array.isArray(terms)) {
        return [];
    }
    return terms
        .map(function (term) { return term.trim(); })
        .filter(function (term) { return term.length > 0; });
}
function mergeTerms(defaultTerms, overrideTerms) {
    var merged = __spreadArray(__spreadArray([], defaultTerms, true), normalizeTerms(overrideTerms), true);
    return __spreadArray([], new Set(merged), true);
}
function buildPattern(terms) {
    if (terms.length === 0) {
        return /$^/;
    }
    var alternation = terms.map(function (term) { return escapeRegexTerm(term); }).join('|');
    return new RegExp("(".concat(alternation, ")"), 'i');
}
function joinTexts(items) {
    return items
        .filter(function (item) { return typeof item === 'string'; })
        .join('\n')
        .trim();
}
function toEmergencyTriageResult(patientId, originalAdvice) {
    return {
        patientId: patientId,
        triageLevel: 'emergency',
        destination: '建议立即线下急诊/专科面诊',
        followupDays: 0,
        educationAdvice: __spreadArray([
            '线上系统仅提供分诊建议，不提供处方与确诊结论。'
        ], originalAdvice.slice(0, 2), true),
    };
}
function buildBlockedReport(reason, original) {
    return {
        conclusion: '安全审校触发：检测到高风险或越界输出风险，已阻断线上建议并转为线下就医路径。',
        evidence: __spreadArray([], new Set(__spreadArray(['SAFETY_OUTPUT_GUARD_V1'], original.evidence, true)), true),
        basis: __spreadArray([], new Set(__spreadArray([reason], original.basis, true)), true),
        actions: [
            '请立即前往线下急诊或专科门诊完成医生面诊评估。',
            '如出现胸痛、呼吸困难、意识变化等症状请立即呼叫急救。',
        ],
        counterfactual: original.counterfactual,
    };
}
function hasUnsafeRequestSignal(request, pattern) {
    var _a;
    var requestText = joinTexts(__spreadArray([
        request.symptomText,
        request.profile.chiefComplaint
    ], ((_a = request.profile.symptoms) !== null && _a !== void 0 ? _a : []), true));
    return pattern.test(requestText);
}
function hasUnsafeOutputSignal(explainableReport, finalConsensus, promptInjectionPattern, unsafeDirectivePattern) {
    var _a;
    var outputText = joinTexts(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        explainableReport.conclusion
    ], explainableReport.actions, true), explainableReport.basis, true), [
        finalConsensus === null || finalConsensus === void 0 ? void 0 : finalConsensus.reasoning
    ], false), ((_a = finalConsensus === null || finalConsensus === void 0 ? void 0 : finalConsensus.actions) !== null && _a !== void 0 ? _a : []), true));
    return (promptInjectionPattern.test(outputText) ||
        unsafeDirectivePattern.test(outputText));
}
var SafetyOutputGuardService = /** @class */ (function () {
    function SafetyOutputGuardService(config) {
        var selfHarmTerms = mergeTerms(DEFAULT_SELF_HARM_OR_VIOLENCE_TERMS, config === null || config === void 0 ? void 0 : config.selfHarmOrViolenceTerms);
        var promptInjectionTerms = mergeTerms(DEFAULT_PROMPT_INJECTION_TERMS, config === null || config === void 0 ? void 0 : config.promptInjectionTerms);
        var unsafeDirectiveTerms = mergeTerms(DEFAULT_UNSAFE_DIRECTIVE_TERMS, config === null || config === void 0 ? void 0 : config.unsafeDirectiveTerms);
        this.selfHarmOrViolencePattern = buildPattern(selfHarmTerms);
        this.promptInjectionPattern = buildPattern(promptInjectionTerms);
        this.unsafeDirectivePattern = buildPattern(unsafeDirectiveTerms);
    }
    SafetyOutputGuardService.prototype.review = function (input) {
        var unsafeRequest = hasUnsafeRequestSignal(input.request, this.selfHarmOrViolencePattern);
        if (unsafeRequest) {
            return {
                blocked: true,
                status: 'ESCALATE_TO_OFFLINE',
                errorCode: 'ERR_ESCALATE_TO_OFFLINE',
                triageResult: toEmergencyTriageResult(input.triageResult.patientId, input.triageResult.educationAdvice),
                explainableReport: buildBlockedReport('检测到自伤/他伤高风险语义', input.explainableReport),
                finalConsensus: undefined,
                reviewDetail: '安全审校触发高危语义，已阻断线上输出并执行线下上转。',
                notes: ['安全审校触发：检测到自伤/他伤高风险语义。'],
            };
        }
        var unsafeOutput = input.debateResult.status === 'OUTPUT' &&
            hasUnsafeOutputSignal(input.explainableReport, input.debateResult.finalConsensus, this.promptInjectionPattern, this.unsafeDirectivePattern);
        if (unsafeOutput) {
            return {
                blocked: true,
                status: 'ESCALATE_TO_OFFLINE',
                errorCode: 'ERR_ADVERSARIAL_PROMPT_DETECTED',
                triageResult: toEmergencyTriageResult(input.triageResult.patientId, input.triageResult.educationAdvice),
                explainableReport: buildBlockedReport('检测到可能导致用药/处置越界的高风险指令', input.explainableReport),
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
    };
    return SafetyOutputGuardService;
}());
exports.SafetyOutputGuardService = SafetyOutputGuardService;
