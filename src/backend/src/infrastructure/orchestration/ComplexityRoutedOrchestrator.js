"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
exports.ComplexityRoutedOrchestrator = void 0;
var ComplexityRoutingPolicy_1 = require("../../application/services/ComplexityRoutingPolicy");
var MinimumInfoSetService_1 = require("../../application/services/MinimumInfoSetService");
var RuleFirstRiskAssessmentService_1 = require("../../application/services/RuleFirstRiskAssessmentService");
var FollowupPlanningService_1 = require("../../application/services/FollowupPlanningService");
var ExplainableReportService_1 = require("../../application/services/ExplainableReportService");
var ConsentValidationService_1 = require("../../application/services/ConsentValidationService");
var SafetyOutputGuardService_1 = require("../../application/services/SafetyOutputGuardService");
var ROUTE_MODE_LABELS = {
    FAST_CONSENSUS: '快速共识',
    LIGHT_DEBATE: '轻度辩论',
    DEEP_DEBATE: '深度辩论',
    ESCALATE_TO_OFFLINE: '线下上转',
};
var DEPARTMENT_LABELS = {
    cardiology: '心血管',
    generalPractice: '全科',
    metabolic: '代谢',
    multiDisciplinary: '多学科',
};
var COLLABORATION_MODE_LABELS = {
    SINGLE_SPECIALTY_PANEL: '同专业多模型协同',
    MULTI_DISCIPLINARY_CONSULT: '多学科专家协同',
    OFFLINE_ESCALATION: '线下上转',
};
var BaselineGuard_1 = require("../../domain/governance/guards/BaselineGuard");
var ConfidenceCalibrator_1 = require("../../domain/governance/calibration/ConfidenceCalibrator");
function formatRoundReasoning(round) {
    return "\u7B2C".concat(round.roundNumber, "\u8F6E\uFF1A\u5206\u6B67\u6307\u6570=").concat(round.dissentIndex.toFixed(3), "\uFF0C\u5206\u6B67\u7B49\u7EA7=").concat(round.dissentBand);
}
function emitRoutingNarrative(decision, options) {
    var _a, _b, _c, _d;
    (_a = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _a === void 0 ? void 0 : _a.call(options, "\u9996\u8F6E\u5206\u8BCA\uFF1A".concat(DEPARTMENT_LABELS[decision.department]));
    (_b = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _b === void 0 ? void 0 : _b.call(options, "\u590D\u6742\u5EA6\u5206\u6D41\uFF1A".concat(ROUTE_MODE_LABELS[decision.routeMode], "\uFF08ComplexityScore=").concat(decision.complexityScore, "\uFF09"));
    (_c = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _c === void 0 ? void 0 : _c.call(options, "\u534F\u540C\u6A21\u5F0F\uFF1A".concat(COLLABORATION_MODE_LABELS[decision.collaborationMode]));
    for (var _i = 0, _e = decision.reasons.slice(0, 3); _i < _e.length; _i++) {
        var reason = _e[_i];
        (_d = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _d === void 0 ? void 0 : _d.call(options, reason);
    }
}
function buildPanelNarrative(routeMode, department) {
    if (routeMode === 'DEEP_DEBATE') {
        return '进入多学科协同会诊面板（复杂病例路径）。';
    }
    if (routeMode === 'LIGHT_DEBATE') {
        return "\u8FDB\u5165".concat(DEPARTMENT_LABELS[department], "\u8F7B\u5EA6\u534F\u540C\u9762\u677F\uFF08\u540C\u4E13\u4E1A\u591A\u6A21\u578B\uFF09\u3002");
    }
    return "\u8FDB\u5165".concat(DEPARTMENT_LABELS[department], "\u5FEB\u901F\u5171\u8BC6\u9762\u677F\uFF08\u540C\u4E13\u4E1A\u4F18\u5148\uFF09\u3002");
}
function createRoutingAuditEvent(sessionId, decision) {
    return {
        eventId: "evt_".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 8)),
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        phase: 'ROUTING',
        eventType: 'BAND_SELECTED',
        details: "\u8DEF\u7531\u51B3\u7B56\uFF1Amode=".concat(decision.routeMode, ", department=").concat(decision.department, ", ") +
            "complexity=".concat(decision.complexityScore),
        provenance: [
            {
                referenceType: 'rule',
                referenceId: 'COMPLEXITY_ROUTING_V4_30',
                description: 'red-flag first, then complexity score routing',
            },
        ],
    };
}
function createReviewAuditEvent(sessionId, blocked, detail) {
    return {
        eventId: "evt_".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 8)),
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        phase: 'REVIEW',
        eventType: blocked ? 'ERROR_RAISED' : 'FINALIZED',
        details: detail,
        provenance: [
            {
                referenceType: 'rule',
                referenceId: 'SAFETY_OUTPUT_GUARD_V1',
                description: 'post-consensus boundary review for unsafe output blocking',
            },
        ],
    };
}
function pickDepartmentEngine(engines, department) {
    if (department === 'metabolic') {
        return engines.metabolic;
    }
    if (department === 'cardiology') {
        return engines.cardiology;
    }
    return engines.generalPractice;
}
function toThresholdBand(dissentValue) {
    if (dissentValue < 0.2) {
        return '一致';
    }
    if (dissentValue < 0.4) {
        return '轻度分歧';
    }
    if (dissentValue < 0.7) {
        return '显著分歧';
    }
    return '严重分歧';
}
function mapDissent(result) {
    if (result.rounds.length === 0) {
        return undefined;
    }
    var latestRound = result.rounds[result.rounds.length - 1];
    return {
        dissonance: latestRound.dissentIndex,
        clinicalSignificance: latestRound.dissentIndex,
        dissentIndex: latestRound.dissentIndex,
        thresholdBand: toThresholdBand(latestRound.dissentIndex),
    };
}
function createWorkflowStage(stage, detail, status) {
    if (status === void 0) { status = 'done'; }
    return {
        stage: stage,
        detail: detail,
        status: status,
        timestamp: new Date().toISOString(),
    };
}
var ComplexityRoutedOrchestrator = /** @class */ (function () {
    function ComplexityRoutedOrchestrator(options) {
        var _a, _b;
        this.fastDepartmentEngines = options.fastDepartmentEngines;
        this.lightDepartmentEngines = options.lightDepartmentEngines;
        this.deepDebateEngine = options.deepDebateEngine;
        this.intakeService = new MinimumInfoSetService_1.MinimumInfoSetService();
        this.consentService = new ConsentValidationService_1.ConsentValidationService();
        this.riskService = new RuleFirstRiskAssessmentService_1.RuleFirstRiskAssessmentService();
        this.followupService = new FollowupPlanningService_1.FollowupPlanningService();
        this.reportService = new ExplainableReportService_1.ExplainableReportService();
        this.safetyOutputGuardService =
            (_a = options.safetyOutputGuardService) !== null && _a !== void 0 ? _a : new SafetyOutputGuardService_1.SafetyOutputGuardService();
        this.baselineGuard = new BaselineGuard_1.BaselineGuard();
        this.confidenceCalibrator = new ConfidenceCalibrator_1.ConfidenceCalibrator();
        this.patientContextEnricher = (_b = options.patientContextEnricher) !== null && _b !== void 0 ? _b : {
            enrich: function (input) {
                return __awaiter(this, void 0, void 0, function () {
                    var _a;
                    return __generator(this, function (_b) {
                        return [2 /*return*/, {
                                profile: input.profile,
                                signals: (_a = input.signals) !== null && _a !== void 0 ? _a : [],
                                insights: [],
                                source: 'local',
                            }];
                    });
                });
            },
        };
    }
    ComplexityRoutedOrchestrator.prototype.runByRoute = function (profile, sessionId, routeMode, department, options) {
        return __awaiter(this, void 0, void 0, function () {
            var engine_1, engine;
            return __generator(this, function (_a) {
                if (routeMode === 'DEEP_DEBATE') {
                    return [2 /*return*/, this.deepDebateEngine.runSession(profile, sessionId, {
                            onRoundCompleted: function (round) {
                                var _a;
                                (_a = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _a === void 0 ? void 0 : _a.call(options, formatRoundReasoning(round));
                            },
                        })];
                }
                if (routeMode === 'LIGHT_DEBATE') {
                    engine_1 = pickDepartmentEngine(this.lightDepartmentEngines, department);
                    return [2 /*return*/, engine_1.runSession(profile, sessionId, {
                            onRoundCompleted: function (round) {
                                var _a;
                                (_a = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _a === void 0 ? void 0 : _a.call(options, formatRoundReasoning(round));
                            },
                        })];
                }
                engine = pickDepartmentEngine(this.fastDepartmentEngines, department);
                return [2 /*return*/, engine.runSession(profile, sessionId, {
                        onRoundCompleted: function (round) {
                            var _a;
                            (_a = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _a === void 0 ? void 0 : _a.call(options, formatRoundReasoning(round));
                        },
                    })];
            });
        });
    };
    ComplexityRoutedOrchestrator.prototype.runSession = function (input, options) {
        return __awaiter(this, void 0, void 0, function () {
            var requestId, sessionId, workflowTrace, pushWorkflowStage, consent, notes, errorCode, enrichedContext, workingInput, mcpInsights, _i, _a, insight, intake, errorCode, risk, decision, triageResult_1, explainableReport_1, outputStage, result, governedResult, governanceNotes, calibration, baselineCheck, finalResult, finalRiskLevel, triageLevel, resultDepartment, triageResult, dissent, explainableReport, safetyOutcome, reviewDetail, routingNote;
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            return __generator(this, function (_r) {
                switch (_r.label) {
                    case 0:
                        requestId = ((_b = input.requestId) === null || _b === void 0 ? void 0 : _b.trim()) || ((_c = input.sessionId) === null || _c === void 0 ? void 0 : _c.trim()) || undefined;
                        sessionId = requestId || "sess_".concat(Date.now());
                        workflowTrace = [];
                        pushWorkflowStage = function (stage) {
                            var _a;
                            workflowTrace.push(stage);
                            (_a = options === null || options === void 0 ? void 0 : options.onWorkflowStage) === null || _a === void 0 ? void 0 : _a.call(options, stage);
                        };
                        pushWorkflowStage(createWorkflowStage('START', '会诊流程启动'));
                        consent = this.consentService.validate(input.consentToken);
                        pushWorkflowStage(createWorkflowStage('INFO_GATHER', consent.ok ? '授权校验通过' : '授权校验失败', consent.ok ? 'done' : 'failed'));
                        if (!consent.ok) {
                            notes = [(_d = consent.message) !== null && _d !== void 0 ? _d : 'consentToken 校验失败。'];
                            errorCode = (_e = consent.errorCode) !== null && _e !== void 0 ? _e : 'ERR_MISSING_REQUIRED_DATA';
                            return [2 /*return*/, {
                                    sessionId: sessionId,
                                    requestId: requestId,
                                    auditRef: "audit_".concat(sessionId),
                                    status: 'ERROR',
                                    rounds: [],
                                    dissentIndexHistory: [],
                                    errorCode: errorCode,
                                    requiredFields: (_f = consent.requiredFields) !== null && _f !== void 0 ? _f : ['consentToken'],
                                    notes: notes,
                                    workflowTrace: __spreadArray([], workflowTrace, true),
                                    auditTrail: [
                                        {
                                            eventId: "evt_".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 8)),
                                            sessionId: sessionId,
                                            timestamp: new Date().toISOString(),
                                            phase: 'INFO_GATHER',
                                            eventType: 'ERROR_RAISED',
                                            details: "".concat(errorCode, ": ").concat(notes.join('; ')),
                                        },
                                    ],
                                }];
                        }
                        return [4 /*yield*/, this.patientContextEnricher.enrich(input)];
                    case 1:
                        enrichedContext = _r.sent();
                        workingInput = __assign(__assign({}, input), { profile: enrichedContext.profile, signals: enrichedContext.signals });
                        mcpInsights = enrichedContext.insights;
                        if (enrichedContext.source === 'mcp') {
                            (_g = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _g === void 0 ? void 0 : _g.call(options, '已接入MCP患者云端数据，正在融合历史病历与近期指标。');
                            for (_i = 0, _a = mcpInsights.slice(0, 3); _i < _a.length; _i++) {
                                insight = _a[_i];
                                (_h = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _h === void 0 ? void 0 : _h.call(options, "MCP\u6D1E\u5BDF\uFF1A".concat(insight));
                            }
                        }
                        intake = this.intakeService.assess(workingInput);
                        pushWorkflowStage(createWorkflowStage('INFO_GATHER', intake.ok ? '最小信息集通过' : '最小信息集缺失', intake.ok ? 'done' : 'failed'));
                        if (!intake.ok) {
                            errorCode = 'ERR_MISSING_REQUIRED_DATA';
                            return [2 /*return*/, {
                                    sessionId: sessionId,
                                    requestId: requestId,
                                    auditRef: "audit_".concat(sessionId),
                                    status: 'ERROR',
                                    rounds: [],
                                    dissentIndexHistory: [],
                                    errorCode: errorCode,
                                    requiredFields: intake.requiredFields,
                                    notes: __spreadArray(__spreadArray([], intake.notes, true), mcpInsights, true),
                                    workflowTrace: __spreadArray([], workflowTrace, true),
                                    auditTrail: [
                                        {
                                            eventId: "evt_".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 8)),
                                            sessionId: sessionId,
                                            timestamp: new Date().toISOString(),
                                            phase: 'INFO_GATHER',
                                            eventType: 'ERROR_RAISED',
                                            details: "".concat(errorCode, ": ").concat(intake.notes.join('; ')),
                                        },
                                    ],
                                }];
                        }
                        risk = this.riskService.evaluate(intake.normalizedProfile, (_j = workingInput.signals) !== null && _j !== void 0 ? _j : []);
                        pushWorkflowStage(createWorkflowStage('RISK_ASSESS', "\u89C4\u5219\u8BC4\u4F30\u5B8C\u6210\uFF1Arisk=".concat(risk.riskLevel, ", triage=").concat(risk.triageLevel)));
                        decision = (0, ComplexityRoutingPolicy_1.decideRouting)(intake.normalizedProfile);
                        pushWorkflowStage(createWorkflowStage('ROUTING', "\u8DEF\u7531=".concat(decision.routeMode, ", \u79D1\u5BA4=").concat(decision.department)));
                        emitRoutingNarrative(decision, options);
                        if (risk.redFlagTriggered || decision.routeMode === 'ESCALATE_TO_OFFLINE') {
                            (_k = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _k === void 0 ? void 0 : _k.call(options, '触发红旗或上转条件，执行线下就医升级路径。');
                            pushWorkflowStage(createWorkflowStage('ESCALATION', '触发红旗短路上转'));
                            pushWorkflowStage(createWorkflowStage('REVIEW', '红旗短路路径无需专家复核', 'skipped'));
                            triageResult_1 = this.followupService.buildPlan({
                                patientId: intake.normalizedProfile.patientId,
                                riskLevel: 'L3',
                                triageLevel: 'emergency',
                                department: 'multiDisciplinary',
                            });
                            explainableReport_1 = this.reportService.build({
                                triageResult: triageResult_1,
                                routing: decision,
                                ruleEvidence: risk.guidelineBasis,
                                additionalEvidence: risk.evidence,
                            });
                            outputStage = createWorkflowStage('OUTPUT', '生成上转结果');
                            pushWorkflowStage(outputStage);
                            return [2 /*return*/, {
                                    sessionId: sessionId,
                                    requestId: requestId,
                                    auditRef: "audit_".concat(sessionId),
                                    status: 'ESCALATE_TO_OFFLINE',
                                    rounds: [],
                                    routing: decision,
                                    triageResult: triageResult_1,
                                    explainableReport: explainableReport_1,
                                    workflowTrace: __spreadArray([], workflowTrace, true),
                                    dissentIndexHistory: [],
                                    errorCode: 'ERR_ESCALATE_TO_OFFLINE',
                                    notes: __spreadArray(__spreadArray(['红旗边界触发，执行线下上转。'], mcpInsights, true), decision.reasons, true),
                                    auditTrail: [createRoutingAuditEvent(sessionId, decision)],
                                }];
                        }
                        (_l = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _l === void 0 ? void 0 : _l.call(options, buildPanelNarrative(decision.routeMode, decision.department));
                        pushWorkflowStage(createWorkflowStage('DEBATE', '进入多模型协同仲裁'));
                        return [4 /*yield*/, this.runByRoute(intake.normalizedProfile, sessionId, decision.routeMode, decision.department, options)];
                    case 2:
                        result = _r.sent();
                        pushWorkflowStage(createWorkflowStage('CONSENSUS', "\u72B6\u6001=".concat(result.status)));
                        governedResult = result;
                        governanceNotes = [];
                        if (result.finalConsensus) {
                            calibration = this.confidenceCalibrator.calibrate(result.finalConsensus);
                            if (calibration.abstain) {
                                governedResult = __assign(__assign({}, result), { status: 'ABSTAIN', errorCode: 'ERR_LOW_CONFIDENCE_ABSTAIN', finalConsensus: undefined });
                                governanceNotes.push("[\u7F6E\u4FE1\u5EA6\u6821\u51C6] \u62D2\u7B54\uFF1A".concat(calibration.reason));
                                (_m = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _m === void 0 ? void 0 : _m.call(options, "\u26A0\uFE0F \u7F6E\u4FE1\u5EA6\u6821\u51C6\u672A\u901A\u8FC7\uFF1A".concat(calibration.reason));
                            }
                            else {
                                // 更新校准后的置信度
                                if (governedResult.finalConsensus) {
                                    governedResult.finalConsensus.confidence = calibration.calibratedConfidence;
                                }
                                governanceNotes.push("[\u7F6E\u4FE1\u5EA6\u6821\u51C6] \u901A\u8FC7\uFF1A".concat(calibration.reason));
                            }
                            // 2. 基线守护 (仅当未被拒答时)
                            if (governedResult.status === 'OUTPUT' && governedResult.finalConsensus) {
                                baselineCheck = this.baselineGuard.check(governedResult.finalConsensus, risk.riskLevel);
                                if (baselineCheck.conflictFlag) {
                                    governanceNotes.push("[\u57FA\u7EBF\u5B88\u62A4] \u53D1\u73B0\u51B2\u7A81\uFF1A".concat(baselineCheck.conflictReason));
                                    (_o = options === null || options === void 0 ? void 0 : options.onReasoningStep) === null || _o === void 0 ? void 0 : _o.call(options, "\uD83D\uDEE1\uFE0F \u57FA\u7EBF\u5B88\u62A4\u89E6\u53D1\uFF1A".concat(baselineCheck.conflictReason));
                                    if (baselineCheck.mitigationAction === 'force_rule') {
                                        // 强制回退到规则基线
                                        governedResult.finalConsensus.riskLevel = baselineCheck.ruleRiskLevel;
                                        governanceNotes.push("[\u57FA\u7EBF\u5B88\u62A4] \u5DF2\u5F3A\u5236\u6267\u884C\u89C4\u5219\u57FA\u7EBF\uFF1A".concat(baselineCheck.ruleRiskLevel));
                                    }
                                }
                            }
                        }
                        finalResult = governedResult;
                        finalRiskLevel = (_q = (_p = finalResult.finalConsensus) === null || _p === void 0 ? void 0 : _p.riskLevel) !== null && _q !== void 0 ? _q : risk.riskLevel;
                        triageLevel = finalResult.status === 'ESCALATE_TO_OFFLINE' ? 'emergency' : risk.triageLevel;
                        resultDepartment = finalResult.status === 'ESCALATE_TO_OFFLINE'
                            ? 'multiDisciplinary'
                            : decision.department;
                        triageResult = this.followupService.buildPlan({
                            patientId: intake.normalizedProfile.patientId,
                            riskLevel: finalRiskLevel,
                            triageLevel: triageLevel,
                            department: resultDepartment,
                        });
                        dissent = mapDissent(finalResult);
                        if (dissent) {
                            triageResult.dissent = dissent;
                        }
                        explainableReport = this.reportService.build({
                            triageResult: triageResult,
                            finalConsensus: finalResult.finalConsensus,
                            routing: decision,
                            ruleEvidence: risk.guidelineBasis,
                            additionalEvidence: risk.evidence,
                        });
                        safetyOutcome = this.safetyOutputGuardService.review({
                            request: workingInput,
                            debateResult: finalResult,
                            triageResult: triageResult,
                            explainableReport: explainableReport,
                        });
                        reviewDetail = safetyOutcome.blocked
                            ? safetyOutcome.reviewDetail
                            : finalResult.status === 'OUTPUT'
                                ? '专家结论复核通过'
                                : finalResult.status === 'ABSTAIN'
                                    ? '专家结论未收敛/低置信，保守复核完成'
                                    : finalResult.status === 'ESCALATE_TO_OFFLINE'
                                        ? '高分歧触发上转，安全复核通过'
                                        : '复核结果异常';
                        pushWorkflowStage(createWorkflowStage('REVIEW', reviewDetail, safetyOutcome.blocked || finalResult.status === 'ERROR' ? 'failed' : 'done'));
                        pushWorkflowStage(createWorkflowStage('OUTPUT', safetyOutcome.blocked
                            ? '安全降级输出完成（已阻断不安全建议）'
                            : '可解释报告生成完成'));
                        routingNote = "\u9996\u8F6E\u5206\u8BCA=".concat(DEPARTMENT_LABELS[decision.department], "; ") +
                            "\u590D\u6742\u5EA6\u5206\u6D41=".concat(ROUTE_MODE_LABELS[decision.routeMode], "; ") +
                            "\u534F\u540C\u6A21\u5F0F=".concat(COLLABORATION_MODE_LABELS[decision.collaborationMode], "; ") +
                            "ComplexityScore=".concat(decision.complexityScore);
                        return [2 /*return*/, __assign(__assign({}, finalResult), { sessionId: sessionId, requestId: requestId, auditRef: "audit_".concat(sessionId), status: safetyOutcome.status, errorCode: safetyOutcome.errorCode, finalConsensus: safetyOutcome.finalConsensus, routing: decision, triageResult: safetyOutcome.triageResult, explainableReport: safetyOutcome.explainableReport, workflowTrace: workflowTrace, notes: __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
                                    '状态机路径：开始 -> 信息采集 -> 风险评估 -> 分流处理 -> 审校 -> 输出',
                                    routingNote
                                ], mcpInsights, true), decision.reasons, true), finalResult.notes, true), governanceNotes, true), safetyOutcome.notes, true), auditTrail: __spreadArray(__spreadArray([], finalResult.auditTrail, true), [
                                    createRoutingAuditEvent(sessionId, decision),
                                    createReviewAuditEvent(sessionId, safetyOutcome.blocked, reviewDetail),
                                ], false) })];
                }
            });
        });
    };
    return ComplexityRoutedOrchestrator;
}());
exports.ComplexityRoutedOrchestrator = ComplexityRoutedOrchestrator;
