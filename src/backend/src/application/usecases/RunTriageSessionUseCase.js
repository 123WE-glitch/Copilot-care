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
exports.RunTriageSessionUseCase = exports.TRIAGE_IDEMPOTENCY_TTL_MS = void 0;
var RequestValidationError_1 = require("../errors/RequestValidationError");
exports.TRIAGE_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
function formatRoundReasoning(round) {
    return "\u7B2C".concat(round.roundNumber, "\u8F6E\uFF1A\u5206\u6B67\u6307\u6570=").concat(round.dissentIndex.toFixed(3), "\uFF0C\u5206\u6B67\u7B49\u7EA7=").concat(round.dissentBand);
}
function canonicalizeValue(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalizeValue);
    }
    if (value && typeof value === 'object') {
        var source = value;
        var keys = Object.keys(source).sort();
        var normalized = {};
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            normalized[key] = canonicalizeValue(source[key]);
        }
        return normalized;
    }
    return value;
}
function buildRequestFingerprint(input) {
    var _a, _b, _c, _d;
    return JSON.stringify({
        profile: canonicalizeValue(input.profile),
        signals: canonicalizeValue((_a = input.signals) !== null && _a !== void 0 ? _a : []),
        symptomText: (_b = input.symptomText) !== null && _b !== void 0 ? _b : '',
        contextVersion: (_c = input.contextVersion) !== null && _c !== void 0 ? _c : '',
        consentToken: (_d = input.consentToken) !== null && _d !== void 0 ? _d : '',
    });
}
function resolveIdempotencyKey(input) {
    var requestId = typeof input.requestId === 'string' ? input.requestId.trim() : '';
    if (requestId) {
        return requestId;
    }
    var sessionId = typeof input.sessionId === 'string' ? input.sessionId.trim() : '';
    return sessionId || undefined;
}
var RunTriageSessionUseCase = /** @class */ (function () {
    function RunTriageSessionUseCase(orchestrator, now) {
        if (now === void 0) { now = function () { return Date.now(); }; }
        this.orchestrator = orchestrator;
        this.now = now;
        this.idempotencyEntries = new Map();
    }
    RunTriageSessionUseCase.prototype.evictExpiredEntries = function (referenceTimeMs) {
        for (var _i = 0, _a = this.idempotencyEntries.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], sessionId = _b[0], entry = _b[1];
            if (referenceTimeMs - entry.createdAtMs > exports.TRIAGE_IDEMPOTENCY_TTL_MS) {
                this.idempotencyEntries.delete(sessionId);
            }
        }
    };
    RunTriageSessionUseCase.prototype.execute = function (input, options) {
        return __awaiter(this, void 0, void 0, function () {
            var nowMs, idempotencyKey, requestFingerprint, existing, _i, _a, stage, _b, _c, reason, _d, _e, round, result;
            var _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        nowMs = this.now();
                        this.evictExpiredEntries(nowMs);
                        idempotencyKey = resolveIdempotencyKey(input);
                        if (!idempotencyKey) {
                            return [2 /*return*/, this.orchestrator.runSession(input, options)];
                        }
                        requestFingerprint = buildRequestFingerprint(input);
                        existing = this.idempotencyEntries.get(idempotencyKey);
                        if (existing) {
                            if (existing.requestFingerprint !== requestFingerprint) {
                                throw new RequestValidationError_1.RequestValidationError('ERR_CONFLICT_UNRESOLVED', 'requestId/sessionId already exists with a different payload.');
                            }
                            if (options === null || options === void 0 ? void 0 : options.onWorkflowStage) {
                                for (_i = 0, _a = (_f = existing.result.workflowTrace) !== null && _f !== void 0 ? _f : []; _i < _a.length; _i++) {
                                    stage = _a[_i];
                                    options.onWorkflowStage(stage);
                                }
                            }
                            if (options === null || options === void 0 ? void 0 : options.onReasoningStep) {
                                for (_b = 0, _c = (_h = (_g = existing.result.routing) === null || _g === void 0 ? void 0 : _g.reasons) !== null && _h !== void 0 ? _h : []; _b < _c.length; _b++) {
                                    reason = _c[_b];
                                    options.onReasoningStep(reason);
                                }
                                for (_d = 0, _e = existing.result.rounds; _d < _e.length; _d++) {
                                    round = _e[_d];
                                    options.onReasoningStep(formatRoundReasoning(round));
                                }
                            }
                            return [2 /*return*/, existing.result];
                        }
                        return [4 /*yield*/, this.orchestrator.runSession(input, options)];
                    case 1:
                        result = _j.sent();
                        this.idempotencyEntries.set(idempotencyKey, {
                            requestFingerprint: requestFingerprint,
                            createdAtMs: nowMs,
                            result: result,
                        });
                        return [2 /*return*/, result];
                }
            });
        });
    };
    return RunTriageSessionUseCase;
}());
exports.RunTriageSessionUseCase = RunTriageSessionUseCase;
