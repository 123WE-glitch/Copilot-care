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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveClinicalLLMTransportPolicy = resolveClinicalLLMTransportPolicy;
exports.createClinicalLLMClient = createClinicalLLMClient;
exports.createClinicalLLMClientForProvider = createClinicalLLMClientForProvider;
exports.resolveClinicalExpertProviderAssignments = resolveClinicalExpertProviderAssignments;
exports.createClinicalExpertLLMClients = createClinicalExpertLLMClients;
var OpenAIClinicalLLMClient_1 = require("./providers/OpenAIClinicalLLMClient");
var AnthropicClinicalLLMClient_1 = require("./providers/AnthropicClinicalLLMClient");
var GeminiClinicalLLMClient_1 = require("./providers/GeminiClinicalLLMClient");
var DeepSeekClinicalLLMClient_1 = require("./providers/DeepSeekClinicalLLMClient");
var KimiClinicalLLMClient_1 = require("./providers/KimiClinicalLLMClient");
function parseTimeout(value) {
    if (!value) {
        return 300000;
    }
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 300000;
    }
    return parsed;
}
function parseNonNegativeInt(value, fallback) {
    if (!value) {
        return fallback;
    }
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return Math.floor(parsed);
}
function resolveClinicalLLMTransportPolicy(env) {
    if (env === void 0) { env = process.env; }
    return {
        timeoutMs: parseTimeout(env.COPILOT_CARE_LLM_TIMEOUT_MS),
        maxRetries: parseNonNegativeInt(env.COPILOT_CARE_LLM_MAX_RETRIES, 1),
        retryDelayMs: parseNonNegativeInt(env.COPILOT_CARE_LLM_RETRY_DELAY_MS, 300),
    };
}
var FallbackClinicalLLMClient = /** @class */ (function () {
    function FallbackClinicalLLMClient(clients) {
        this.clients = clients;
    }
    FallbackClinicalLLMClient.prototype.generateOpinion = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, client, response, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _i = 0, _a = this.clients;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        client = _a[_i];
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, client.generateOpinion(input)];
                    case 3:
                        response = _c.sent();
                        if (response) {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        _b = _c.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, null];
                }
            });
        });
    };
    return FallbackClinicalLLMClient;
}());
function selectModel(env, providerSpecific, fallback) {
    return providerSpecific || env.COPILOT_CARE_LLM_MODEL || fallback;
}
var EXPERT_PROVIDER_POLICY = {
    cardiology: {
        envKey: 'COPILOT_CARE_CARDIO_PROVIDER',
        defaultProvider: 'deepseek',
    },
    generalPractice: {
        envKey: 'COPILOT_CARE_GP_PROVIDER',
        defaultProvider: 'gemini',
    },
    metabolic: {
        envKey: 'COPILOT_CARE_METABOLIC_PROVIDER',
        defaultProvider: 'gemini',
    },
    safety: {
        envKey: 'COPILOT_CARE_SAFETY_PROVIDER',
        defaultProvider: 'kimi',
    },
};
var VALID_EXPERT_PROVIDER_SET = new Set([
    'none',
    'auto',
    'deepseek',
    'gemini',
    'kimi',
    'openai',
    'anthropic',
    'deepseek_gemini',
]);
function createProviderClients(env, transportPolicy) {
    return {
        deepseek: env.DEEPSEEK_API_KEY
            ? new DeepSeekClinicalLLMClient_1.DeepSeekClinicalLLMClient({
                apiKey: env.DEEPSEEK_API_KEY,
                model: selectModel(env, env.DEEPSEEK_LLM_MODEL, 'deepseek-chat'),
                timeoutMs: transportPolicy.timeoutMs,
                maxRetries: transportPolicy.maxRetries,
                retryDelayMs: transportPolicy.retryDelayMs,
                baseUrl: env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
            })
            : null,
        gemini: env.GEMINI_API_KEY
            ? new GeminiClinicalLLMClient_1.GeminiClinicalLLMClient({
                apiKey: env.GEMINI_API_KEY,
                model: selectModel(env, env.GEMINI_LLM_MODEL, 'gemini-2.5-flash'),
                timeoutMs: transportPolicy.timeoutMs,
                maxRetries: transportPolicy.maxRetries,
                retryDelayMs: transportPolicy.retryDelayMs,
                baseUrl: env.GEMINI_BASE_URL ||
                    'https://generativelanguage.googleapis.com/v1beta',
            })
            : null,
        kimi: env.KIMI_API_KEY
            ? new KimiClinicalLLMClient_1.KimiClinicalLLMClient({
                apiKey: env.KIMI_API_KEY,
                model: selectModel(env, env.KIMI_LLM_MODEL, 'moonshot-v1-8k'),
                timeoutMs: transportPolicy.timeoutMs,
                maxRetries: transportPolicy.maxRetries,
                retryDelayMs: transportPolicy.retryDelayMs,
                baseUrl: env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
            })
            : null,
        openai: env.OPENAI_API_KEY
            ? new OpenAIClinicalLLMClient_1.OpenAIClinicalLLMClient({
                apiKey: env.OPENAI_API_KEY,
                model: selectModel(env, env.OPENAI_LLM_MODEL, 'gpt-5-mini'),
                timeoutMs: transportPolicy.timeoutMs,
                maxRetries: transportPolicy.maxRetries,
                retryDelayMs: transportPolicy.retryDelayMs,
                baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            })
            : null,
        anthropic: env.ANTHROPIC_API_KEY
            ? new AnthropicClinicalLLMClient_1.AnthropicClinicalLLMClient({
                apiKey: env.ANTHROPIC_API_KEY,
                model: selectModel(env, env.ANTHROPIC_LLM_MODEL, 'claude-sonnet-4-5'),
                timeoutMs: transportPolicy.timeoutMs,
                maxRetries: transportPolicy.maxRetries,
                retryDelayMs: transportPolicy.retryDelayMs,
                baseUrl: env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
            })
            : null,
    };
}
function buildFallbackChain(providers, clients) {
    var chain = providers
        .map(function (provider) { return clients[provider]; })
        .filter(function (client) { return Boolean(client); });
    if (chain.length === 0) {
        return null;
    }
    return chain.length === 1 ? chain[0] : new FallbackClinicalLLMClient(chain);
}
function parseProviderChain(value) {
    return value
        .split(/[,\|>\s]+/)
        .map(function (item) { return item.trim().toLowerCase(); })
        .filter(Boolean);
}
function createClinicalLLMClient(env) {
    if (env === void 0) { env = process.env; }
    if (env === process.env &&
        env.NODE_ENV === 'test' &&
        env.COPILOT_CARE_ENABLE_LLM_IN_TEST !== 'true') {
        return null;
    }
    var provider = (env.COPILOT_CARE_LLM_PROVIDER || 'auto').toLowerCase();
    var transportPolicy = resolveClinicalLLMTransportPolicy(env);
    var clients = createProviderClients(env, transportPolicy);
    if (provider === 'none') {
        return null;
    }
    if (provider === 'deepseek_gemini') {
        return buildFallbackChain(['deepseek', 'gemini'], clients);
    }
    var chainProviders = parseProviderChain(provider);
    if (chainProviders.length > 1) {
        return buildFallbackChain(chainProviders, clients);
    }
    if (chainProviders.length === 1 && chainProviders[0] in clients) {
        return clients[chainProviders[0]] || null;
    }
    var autoChain = buildFallbackChain(['deepseek', 'gemini', 'kimi', 'openai', 'anthropic'], clients);
    return autoChain;
}
function buildClientWithScopedProvider(env, provider) {
    var scopedEnv = __assign(__assign({}, env), { COPILOT_CARE_LLM_PROVIDER: provider });
    return createClinicalLLMClient(scopedEnv);
}
function createClinicalLLMClientForProvider(provider, env) {
    if (env === void 0) { env = process.env; }
    return buildClientWithScopedProvider(env, provider);
}
function resolveSingleExpertProvider(env, envKey, fallback) {
    var explicit = env[envKey];
    if (!explicit || !explicit.trim()) {
        return {
            provider: fallback,
            source: 'default',
            envKey: envKey,
        };
    }
    var candidate = explicit.trim().toLowerCase();
    if (!VALID_EXPERT_PROVIDER_SET.has(candidate)) {
        return {
            provider: fallback,
            source: 'invalid_fallback',
            envKey: envKey,
        };
    }
    return {
        provider: candidate,
        source: 'env',
        envKey: envKey,
    };
}
function resolveClinicalExpertProviderAssignments(env) {
    if (env === void 0) { env = process.env; }
    var keys = Object.keys(EXPERT_PROVIDER_POLICY);
    var assignmentEntries = keys.map(function (key) {
        var policy = EXPERT_PROVIDER_POLICY[key];
        var assignment = resolveSingleExpertProvider(env, policy.envKey, policy.defaultProvider);
        return [key, assignment];
    });
    return Object.fromEntries(assignmentEntries);
}
function createClinicalExpertLLMClients(env) {
    if (env === void 0) { env = process.env; }
    if (env === process.env &&
        env.NODE_ENV === 'test' &&
        env.COPILOT_CARE_ENABLE_LLM_IN_TEST !== 'true') {
        return {
            cardiology: null,
            generalPractice: null,
            metabolic: null,
            safety: null,
        };
    }
    var assignments = resolveClinicalExpertProviderAssignments(env);
    return {
        cardiology: buildClientWithScopedProvider(env, assignments.cardiology.provider),
        generalPractice: buildClientWithScopedProvider(env, assignments.generalPractice.provider),
        metabolic: buildClientWithScopedProvider(env, assignments.metabolic.provider),
        safety: buildClientWithScopedProvider(env, assignments.safety.provider),
    };
}
