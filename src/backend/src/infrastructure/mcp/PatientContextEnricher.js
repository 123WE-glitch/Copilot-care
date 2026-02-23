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
exports.createPatientContextEnricher = createPatientContextEnricher;
var http_1 = require("../../llm/http");
function parsePositiveInt(value, fallback) {
    if (!value) {
        return fallback;
    }
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.floor(parsed);
}
function parseMcpConfig(env) {
    var baseUrl = (env.COPILOT_CARE_MCP_BASE_URL || '').trim();
    return {
        enabled: Boolean(baseUrl),
        baseUrl: baseUrl,
        apiKey: (env.COPILOT_CARE_MCP_API_KEY || '').trim() || undefined,
        timeoutMs: parsePositiveInt(env.COPILOT_CARE_MCP_TIMEOUT_MS, 30000),
        maxRetries: parsePositiveInt(env.COPILOT_CARE_MCP_MAX_RETRIES, 0),
        retryDelayMs: parsePositiveInt(env.COPILOT_CARE_MCP_RETRY_DELAY_MS, 200),
    };
}
function toStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .filter(function (item) { return typeof item === 'string'; })
        .map(function (item) { return item.trim(); })
        .filter(Boolean);
}
function mergeStringArray(base, patch) {
    return __spreadArray([], new Set(__spreadArray(__spreadArray([], base, true), patch, true)), true);
}
function toOptionalNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim()) {
        var parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return undefined;
}
function sanitizeSignal(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    var source = raw;
    var timestamp = typeof source.timestamp === 'string' && source.timestamp.trim()
        ? source.timestamp
        : new Date().toISOString();
    var origin = source.source === 'wearable' ||
        source.source === 'manual' ||
        source.source === 'hospital'
        ? source.source
        : 'hospital';
    var signal = {
        timestamp: timestamp,
        source: origin,
    };
    var fields = [
        'systolicBP',
        'diastolicBP',
        'heartRate',
        'spo2',
        'bloodGlucose',
        'bloodLipid',
    ];
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
        var field = fields_1[_i];
        var value = toOptionalNumber(source[field]);
        if (typeof value === 'number') {
            signal[field] = value;
        }
    }
    return signal;
}
function sanitizeSignals(raw) {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .map(function (item) { return sanitizeSignal(item); })
        .filter(function (item) { return Boolean(item); });
}
function mergeProfile(profile, patch) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    var mergedVitals = __assign(__assign({}, ((_a = profile.vitals) !== null && _a !== void 0 ? _a : {})), ((_b = patch.vitals) !== null && _b !== void 0 ? _b : {}));
    return __assign(__assign(__assign({}, profile), patch), { chronicDiseases: mergeStringArray((_c = profile.chronicDiseases) !== null && _c !== void 0 ? _c : [], (_d = patch.chronicDiseases) !== null && _d !== void 0 ? _d : []), medicationHistory: mergeStringArray((_e = profile.medicationHistory) !== null && _e !== void 0 ? _e : [], (_f = patch.medicationHistory) !== null && _f !== void 0 ? _f : []), allergyHistory: mergeStringArray((_g = profile.allergyHistory) !== null && _g !== void 0 ? _g : [], (_h = patch.allergyHistory) !== null && _h !== void 0 ? _h : []), lifestyleTags: mergeStringArray((_j = profile.lifestyleTags) !== null && _j !== void 0 ? _j : [], (_k = patch.lifestyleTags) !== null && _k !== void 0 ? _k : []), vitals: Object.keys(mergedVitals).length > 0 ? mergedVitals : undefined });
}
function sanitizeProfilePatch(raw) {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    var source = raw;
    var patch = {};
    var age = toOptionalNumber(source.age);
    if (typeof age === 'number' && age > 0) {
        patch.age = age;
    }
    if (source.sex === 'male' || source.sex === 'female' || source.sex === 'other') {
        patch.sex = source.sex;
    }
    if (typeof source.name === 'string' && source.name.trim()) {
        patch.name = source.name.trim();
    }
    if (typeof source.chiefComplaint === 'string' && source.chiefComplaint.trim()) {
        patch.chiefComplaint = source.chiefComplaint.trim();
    }
    if (typeof source.tcmConstitution === 'string' && source.tcmConstitution.trim()) {
        patch.tcmConstitution = source.tcmConstitution.trim();
    }
    patch.symptoms = toStringArray(source.symptoms);
    patch.chronicDiseases = toStringArray(source.chronicDiseases);
    patch.medicationHistory = toStringArray(source.medicationHistory);
    patch.allergyHistory = toStringArray(source.allergyHistory);
    patch.lifestyleTags = toStringArray(source.lifestyleTags);
    if (source.vitals && typeof source.vitals === 'object') {
        var vitalsSource = source.vitals;
        patch.vitals = {
            systolicBP: toOptionalNumber(vitalsSource.systolicBP),
            diastolicBP: toOptionalNumber(vitalsSource.diastolicBP),
            heartRate: toOptionalNumber(vitalsSource.heartRate),
            spo2: toOptionalNumber(vitalsSource.spo2),
            bloodGlucose: toOptionalNumber(vitalsSource.bloodGlucose),
            bloodLipid: toOptionalNumber(vitalsSource.bloodLipid),
        };
    }
    return patch;
}
var NoopPatientContextEnricher = /** @class */ (function () {
    function NoopPatientContextEnricher() {
    }
    NoopPatientContextEnricher.prototype.enrich = function (input) {
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
    };
    return NoopPatientContextEnricher;
}());
var HttpPatientContextEnricher = /** @class */ (function () {
    function HttpPatientContextEnricher(config) {
        this.config = config;
    }
    HttpPatientContextEnricher.prototype.enrich = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var fallback, endpoint, payload, candidate, profilePatch, remoteSignals, insights, mergedProfile, mergedSignals, _a;
            var _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        fallback = {
                            profile: input.profile,
                            signals: (_b = input.signals) !== null && _b !== void 0 ? _b : [],
                            insights: [],
                            source: 'local',
                        };
                        if (!this.config.enabled) {
                            return [2 /*return*/, fallback];
                        }
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        endpoint = "".concat(this.config.baseUrl.replace(/\/+$/, ''), "/patient/context");
                        return [4 /*yield*/, (0, http_1.postJson)({
                                url: endpoint,
                                timeoutMs: this.config.timeoutMs,
                                maxRetries: this.config.maxRetries,
                                retryDelayMs: this.config.retryDelayMs,
                                headers: this.config.apiKey
                                    ? { Authorization: "Bearer ".concat(this.config.apiKey) }
                                    : {},
                                body: {
                                    requestId: input.requestId,
                                    sessionId: input.sessionId,
                                    consentToken: input.consentToken,
                                    symptomText: input.symptomText,
                                    profile: input.profile,
                                    signals: (_c = input.signals) !== null && _c !== void 0 ? _c : [],
                                },
                            })];
                    case 2:
                        payload = _e.sent();
                        candidate = payload && typeof payload === 'object'
                            ? payload
                            : {};
                        profilePatch = sanitizeProfilePatch(candidate.profilePatch);
                        remoteSignals = sanitizeSignals(candidate.signals);
                        insights = toStringArray(candidate.insights).slice(0, 8);
                        mergedProfile = mergeProfile(input.profile, profilePatch);
                        mergedSignals = __spreadArray(__spreadArray([], ((_d = input.signals) !== null && _d !== void 0 ? _d : []), true), remoteSignals, true);
                        if (insights.length === 0) {
                            insights.push('已接入MCP患者云端数据并完成上下文融合。');
                        }
                        return [2 /*return*/, {
                                profile: mergedProfile,
                                signals: mergedSignals,
                                insights: insights,
                                source: 'mcp',
                            }];
                    case 3:
                        _a = _e.sent();
                        return [2 /*return*/, fallback];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return HttpPatientContextEnricher;
}());
function createPatientContextEnricher(env) {
    if (env === void 0) { env = process.env; }
    var config = parseMcpConfig(env);
    if (!config.enabled) {
        return new NoopPatientContextEnricher();
    }
    return new HttpPatientContextEnricher(config);
}
