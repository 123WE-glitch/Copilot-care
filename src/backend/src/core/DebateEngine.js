"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebateEngine = void 0;
var DebateEngine = /** @class */ (function () {
    function DebateEngine(agents, options) {
        this.maxRounds = 3;
        this.alpha = 0.7;
        this.beta = 0.3;
        this.thresholds = {
            consensus: 0.2,
            lightDebate: 0.4,
            deepDebate: 0.7,
        };
        this.agents = agents;
        if (options &&
            typeof options.maxRounds === 'number' &&
            Number.isFinite(options.maxRounds) &&
            options.maxRounds > 0) {
            this.maxRounds = Math.floor(options.maxRounds);
        }
    }
    DebateEngine.prototype.getRiskNumeric = function (level) {
        var mapping = {
            L0: 0,
            L1: 1,
            L2: 2,
            L3: 3,
        };
        return mapping[level];
    };
    DebateEngine.prototype.normalize = function (value, min, max) {
        if (Number.isNaN(value) || !Number.isFinite(value)) {
            return min;
        }
        return Math.min(max, Math.max(min, value));
    };
    // Disagreement term from risk-level dispersion, normalized to [0, 1].
    DebateEngine.prototype.calculateDisagreement = function (opinions) {
        var _this = this;
        if (opinions.length === 0) {
            return 0;
        }
        var values = opinions.map(function (opinion) { return _this.getRiskNumeric(opinion.riskLevel); });
        var mean = values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
        var variance = values.reduce(function (sum, value) { return sum + Math.pow((value - mean), 2); }, 0) / values.length;
        var stdDev = Math.sqrt(variance);
        // For a 0..3 bounded variable, 1.5 is the practical maximum std-dev.
        return this.normalize(stdDev / 1.5, 0, 1);
    };
    // Clinical significance term from action-direction conflict and boundary spread.
    DebateEngine.prototype.calculateClinicalSignificance = function (opinions) {
        var _this = this;
        if (opinions.length === 0) {
            return 0;
        }
        var values = opinions.map(function (opinion) { return _this.getRiskNumeric(opinion.riskLevel); });
        var spread = Math.max.apply(Math, values) - Math.min.apply(Math, values);
        var hasL3 = values.some(function (value) { return value >= 3; });
        var escalationPattern = /(urgent|escalat|offline|referr|emergency|线下|上转|升级|急诊|尽快就医)/i;
        var conservativePattern = /(monitor|follow-up|lifestyle|observe|随访|观察|生活方式|复查)/i;
        var escalationVotes = opinions.some(function (opinion) {
            return opinion.actions.some(function (action) { return escalationPattern.test(action); });
        });
        var conservativeVotes = opinions.some(function (opinion) {
            return opinion.actions.some(function (action) { return conservativePattern.test(action); });
        });
        var directionConflict = escalationVotes && conservativeVotes;
        var significance = 0;
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
    };
    // Dissent Index = alpha * disagreement + beta * clinical significance.
    DebateEngine.prototype.calculateDissent = function (opinions) {
        var disagreement = this.calculateDisagreement(opinions);
        var clinicalSignificance = this.calculateClinicalSignificance(opinions);
        var index = this.normalize(this.alpha * disagreement + this.beta * clinicalSignificance, 0, 1);
        return { index: index, disagreement: disagreement, clinicalSignificance: clinicalSignificance };
    };
    DebateEngine.prototype.getBand = function (dissentIndex) {
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
    };
    DebateEngine.prototype.createAuditEvent = function (sessionId, phase, eventType, details, provenance) {
        if (provenance === void 0) { provenance = []; }
        return {
            eventId: "evt_".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 8)),
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            phase: phase,
            eventType: eventType,
            details: details,
            provenance: provenance,
        };
    };
    DebateEngine.prototype.selectConsensus = function (opinions) {
        var _this = this;
        if (opinions.length === 0) {
            return undefined;
        }
        var scored = opinions.map(function (opinion) {
            var guidelineFit = opinion.citations.length > 0 ? 1 : 0.5;
            var confidenceScore = _this.normalize(opinion.confidence, 0, 1);
            var safetyPriority = _this.normalize(_this.getRiskNumeric(opinion.riskLevel) / 3, 0, 1);
            var consensusScore = 0.5 * guidelineFit + 0.3 * confidenceScore + 0.2 * safetyPriority;
            return { opinion: opinion, consensusScore: consensusScore };
        });
        scored.sort(function (a, b) { return b.consensusScore - a.consensusScore; });
        return scored[0].opinion;
    };
    DebateEngine.prototype.validateInput = function (profile) {
        var _a, _b;
        if (!profile.patientId || !profile.sex || !Number.isFinite(profile.age)) {
            return 'ERR_MISSING_REQUIRED_DATA';
        }
        if (!Array.isArray(profile.chronicDiseases) || !Array.isArray(profile.medicationHistory)) {
            return 'ERR_MISSING_REQUIRED_DATA';
        }
        if (((_a = profile.vitals) === null || _a === void 0 ? void 0 : _a.systolicBP) !== undefined &&
            ((_b = profile.vitals) === null || _b === void 0 ? void 0 : _b.diastolicBP) !== undefined &&
            profile.vitals.systolicBP <= profile.vitals.diastolicBP) {
            return 'ERR_INVALID_VITAL_SIGN';
        }
        return undefined;
    };
    DebateEngine.prototype.hasRedFlag = function (profile) {
        var _a, _b, _c, _d, _e;
        var symptoms = (_a = profile.symptoms) !== null && _a !== void 0 ? _a : [];
        var redFlagTerms = [
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
        var symptomFlag = symptoms.some(function (symptom) {
            return redFlagTerms.some(function (term) { return symptom.toLowerCase().includes(term); });
        });
        var bpFlag = ((_c = (_b = profile.vitals) === null || _b === void 0 ? void 0 : _b.systolicBP) !== null && _c !== void 0 ? _c : 0) >= 180 || ((_e = (_d = profile.vitals) === null || _d === void 0 ? void 0 : _d.diastolicBP) !== null && _e !== void 0 ? _e : 0) >= 110;
        return symptomFlag || bpFlag;
    };
    DebateEngine.prototype.buildInitialResult = function (sessionId, status, errorCode, notes) {
        var auditTrail = [
            this.createAuditEvent(sessionId, 'INPUT_VALIDATION', 'ERROR_RAISED', "".concat(errorCode, ": ").concat(notes)),
        ];
        return {
            sessionId: sessionId,
            status: status,
            rounds: [],
            dissentIndexHistory: [],
            errorCode: errorCode,
            notes: [notes],
            auditTrail: auditTrail,
        };
    };
    DebateEngine.prototype.runSession = function (profile_1) {
        return __awaiter(this, arguments, void 0, function (profile, sessionId, hooks) {
            var history, auditTrail, notes, validationError, context, dissentIndexHistory, round, opinions, dissent, band, roundResult, lowConfidence, finalConsensus, finalConsensus;
            var _a, _b;
            if (sessionId === void 0) { sessionId = "sess_".concat(Date.now()); }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        history = [];
                        auditTrail = [];
                        notes = [];
                        validationError = this.validateInput(profile);
                        if (validationError) {
                            return [2 /*return*/, this.buildInitialResult(sessionId, 'ERROR', validationError, '输入校验失败。')];
                        }
                        if (this.hasRedFlag(profile)) {
                            return [2 /*return*/, this.buildInitialResult(sessionId, 'ESCALATE_TO_OFFLINE', 'ERR_ESCALATE_TO_OFFLINE', '检测到红旗信号，建议立即转线下就医。')];
                        }
                        context = '初始评估';
                        dissentIndexHistory = [];
                        round = 1;
                        _c.label = 1;
                    case 1:
                        if (!(round <= this.maxRounds)) return [3 /*break*/, 4];
                        (_a = hooks === null || hooks === void 0 ? void 0 : hooks.onRoundStarted) === null || _a === void 0 ? void 0 : _a.call(hooks, round);
                        auditTrail.push(this.createAuditEvent(sessionId, 'RISK_EVALUATION', 'ROUND_STARTED', "\u7B2C".concat(round, "\u8F6E\u4F1A\u8BCA\u5F00\u59CB\u3002")));
                        return [4 /*yield*/, Promise.all(this.agents.map(function (agent) { return agent.think(profile, context); }))];
                    case 2:
                        opinions = _c.sent();
                        dissent = this.calculateDissent(opinions);
                        band = this.getBand(dissent.index);
                        dissentIndexHistory.push(dissent.index);
                        auditTrail.push(this.createAuditEvent(sessionId, 'DI_CALCULATION', 'ROUND_COMPLETED', "\u7B2C".concat(round, "\u8F6E\uFF1A\u5206\u6B67\u6307\u6570=").concat(dissent.index.toFixed(3), "\uFF0C\u98CE\u9669\u5206\u6563=").concat(dissent.disagreement.toFixed(3), "\uFF0C\u4E34\u5E8A\u51B2\u7A81=").concat(dissent.clinicalSignificance.toFixed(3), "\u3002"), [
                            {
                                referenceType: 'rule',
                                referenceId: 'DI_ALPHA_BETA',
                                description: "alpha=".concat(this.alpha, ", beta=").concat(this.beta),
                            },
                        ]));
                        roundResult = {
                            roundNumber: round,
                            opinions: opinions,
                            dissentIndex: dissent.index,
                            dissentBand: band,
                            moderatorSummary: "\u5206\u6B67\u7B49\u7EA7=".concat(band, "\uFF0C\u5206\u6B67\u6307\u6570=").concat(dissent.index.toFixed(3)),
                        };
                        history.push(roundResult);
                        (_b = hooks === null || hooks === void 0 ? void 0 : hooks.onRoundCompleted) === null || _b === void 0 ? void 0 : _b.call(hooks, roundResult);
                        auditTrail.push(this.createAuditEvent(sessionId, 'ARBITRATION', 'BAND_SELECTED', "\u7B2C".concat(round, "\u8F6E\u5224\u5B9A\u5206\u6B67\u7B49\u7EA7\u4E3A ").concat(band, "\u3002"), [
                            {
                                referenceType: 'guideline',
                                referenceId: 'DI_THRESHOLDS',
                                description: '<0.2 consensus, 0.2-0.4 light, 0.4-0.7 deep, >=0.7 escalate',
                            },
                        ]));
                        lowConfidence = opinions.every(function (opinion) { return opinion.confidence < 0.7; });
                        if (lowConfidence) {
                            notes.push('全部意见置信度低于0.7阈值。');
                            return [2 /*return*/, {
                                    sessionId: sessionId,
                                    status: 'ABSTAIN',
                                    rounds: history,
                                    finalConsensus: undefined,
                                    dissentIndexHistory: dissentIndexHistory,
                                    errorCode: 'ERR_LOW_CONFIDENCE_ABSTAIN',
                                    notes: notes,
                                    auditTrail: auditTrail,
                                }];
                        }
                        if (band === 'CONSENSUS') {
                            finalConsensus = this.selectConsensus(opinions);
                            auditTrail.push(this.createAuditEvent(sessionId, 'OUTPUT', 'FINALIZED', "\u7B2C".concat(round, "\u8F6E\u8FBE\u6210\u5171\u8BC6\u3002")));
                            return [2 /*return*/, {
                                    sessionId: sessionId,
                                    status: 'OUTPUT',
                                    rounds: history,
                                    finalConsensus: finalConsensus,
                                    dissentIndexHistory: dissentIndexHistory,
                                    notes: notes,
                                    auditTrail: auditTrail,
                                }];
                        }
                        if (band === 'LIGHT_DEBATE' && round >= 2) {
                            finalConsensus = this.selectConsensus(opinions);
                            notes.push('轻度分歧已在一轮辩论后收敛。');
                            auditTrail.push(this.createAuditEvent(sessionId, 'OUTPUT', 'FINALIZED', "\u7B2C".concat(round, "\u8F6E\u5B8C\u6210\u8F7B\u5EA6\u5206\u6B67\u6536\u655B\u3002")));
                            return [2 /*return*/, {
                                    sessionId: sessionId,
                                    status: 'OUTPUT',
                                    rounds: history,
                                    finalConsensus: finalConsensus,
                                    dissentIndexHistory: dissentIndexHistory,
                                    notes: notes,
                                    auditTrail: auditTrail,
                                }];
                        }
                        if (band === 'ESCALATE') {
                            notes.push('检测到高分歧，触发保守线下升级。');
                            return [2 /*return*/, {
                                    sessionId: sessionId,
                                    status: 'ESCALATE_TO_OFFLINE',
                                    rounds: history,
                                    finalConsensus: undefined,
                                    dissentIndexHistory: dissentIndexHistory,
                                    errorCode: 'ERR_ESCALATE_TO_OFFLINE',
                                    notes: notes,
                                    auditTrail: auditTrail,
                                }];
                        }
                        // 3. Update context for next round.
                        context = "\u4E0A\u4E00\u8F6E\u5B58\u5728\u51B2\u7A81\u610F\u89C1\uFF1A".concat(JSON.stringify(opinions));
                        _c.label = 3;
                    case 3:
                        round++;
                        return [3 /*break*/, 1];
                    case 4:
                        notes.push('达到最大轮次后冲突仍未收敛。');
                        auditTrail.push(this.createAuditEvent(sessionId, 'ESCALATION', 'ERROR_RAISED', '达到最大轮次仍未达成共识。'));
                        return [2 /*return*/, {
                                sessionId: sessionId,
                                status: 'ABSTAIN',
                                rounds: history,
                                finalConsensus: undefined,
                                dissentIndexHistory: dissentIndexHistory,
                                errorCode: 'ERR_CONFLICT_UNRESOLVED',
                                notes: notes,
                                auditTrail: auditTrail,
                            }];
                }
            });
        });
    };
    DebateEngine.prototype.runDebate = function (profile) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.runSession(profile)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rounds];
                }
            });
        });
    };
    return DebateEngine;
}());
exports.DebateEngine = DebateEngine;
