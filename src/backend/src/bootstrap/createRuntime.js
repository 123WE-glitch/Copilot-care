"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.createRuntime = createRuntime;
var CardiologyAgent_1 = require("../agents/CardiologyAgent");
var GPAgent_1 = require("../agents/GPAgent");
var MetabolicAgent_1 = require("../agents/MetabolicAgent");
var SafetyAgent_1 = require("../agents/SafetyAgent");
var SafetyOutputGuardService_1 = require("../application/services/SafetyOutputGuardService");
var RunTriageSessionUseCase_1 = require("../application/usecases/RunTriageSessionUseCase");
var DebateEngine_1 = require("../core/DebateEngine");
var ComplexityRoutedOrchestrator_1 = require("../infrastructure/orchestration/ComplexityRoutedOrchestrator");
var CoordinatorSnapshotService_1 = require("../infrastructure/orchestration/CoordinatorSnapshotService");
var PatientContextEnricher_1 = require("../infrastructure/mcp/PatientContextEnricher");
var createClinicalLLMClient_1 = require("../llm/createClinicalLLMClient");
var PANEL_PROVIDER_DEFAULTS = {
    cardiology: ['deepseek', 'gemini'],
    generalPractice: ['gemini', 'deepseek'],
    metabolic: ['gemini', 'deepseek'],
};
var PANEL_PROVIDER_ENV_KEYS = {
    cardiology: 'COPILOT_CARE_CARDIO_PANEL_PROVIDERS',
    generalPractice: 'COPILOT_CARE_GP_PANEL_PROVIDERS',
    metabolic: 'COPILOT_CARE_METABOLIC_PANEL_PROVIDERS',
};
var PANEL_PROVIDER_CANDIDATES = new Set([
    'deepseek',
    'gemini',
    'kimi',
    'openai',
    'anthropic',
]);
function parsePanelProviders(value) {
    if (!value) {
        return [];
    }
    return value
        .split(/[,\|>\s]+/)
        .map(function (item) { return item.trim().toLowerCase(); })
        .filter(function (item) { return PANEL_PROVIDER_CANDIDATES.has(item); });
}
function dedupeProviders(providers) {
    return __spreadArray([], new Set(providers), true);
}
function resolvePanelProviders(env) {
    return {
        cardiology: dedupeProviders(parsePanelProviders(env[PANEL_PROVIDER_ENV_KEYS.cardiology]).length > 0
            ? parsePanelProviders(env[PANEL_PROVIDER_ENV_KEYS.cardiology])
            : PANEL_PROVIDER_DEFAULTS.cardiology),
        generalPractice: dedupeProviders(parsePanelProviders(env[PANEL_PROVIDER_ENV_KEYS.generalPractice]).length > 0
            ? parsePanelProviders(env[PANEL_PROVIDER_ENV_KEYS.generalPractice])
            : PANEL_PROVIDER_DEFAULTS.generalPractice),
        metabolic: dedupeProviders(parsePanelProviders(env[PANEL_PROVIDER_ENV_KEYS.metabolic]).length > 0
            ? parsePanelProviders(env[PANEL_PROVIDER_ENV_KEYS.metabolic])
            : PANEL_PROVIDER_DEFAULTS.metabolic),
    };
}
function parseSafetyGuardTerms(value) {
    if (!value) {
        return undefined;
    }
    var terms = value
        .split(/[;,\|\n]+/)
        .map(function (item) { return item.trim(); })
        .filter(function (item) { return item.length > 0; });
    return terms.length > 0 ? terms : undefined;
}
function resolveSafetyOutputGuardConfig(env) {
    return {
        selfHarmOrViolenceTerms: parseSafetyGuardTerms(env.COPILOT_CARE_SAFETY_SELF_HARM_TERMS),
        promptInjectionTerms: parseSafetyGuardTerms(env.COPILOT_CARE_SAFETY_PROMPT_INJECTION_TERMS),
        unsafeDirectiveTerms: parseSafetyGuardTerms(env.COPILOT_CARE_SAFETY_UNSAFE_DIRECTIVE_TERMS),
    };
}
var PanelCardiologyAgent = /** @class */ (function (_super) {
    __extends(PanelCardiologyAgent, _super);
    function PanelCardiologyAgent(id, name, llmClient) {
        var _this = _super.call(this, llmClient) || this;
        _this.id = id;
        _this.name = name;
        return _this;
    }
    return PanelCardiologyAgent;
}(CardiologyAgent_1.CardiologyAgent));
var PanelGPAgent = /** @class */ (function (_super) {
    __extends(PanelGPAgent, _super);
    function PanelGPAgent(id, name, llmClient) {
        var _this = _super.call(this, llmClient) || this;
        _this.id = id;
        _this.name = name;
        return _this;
    }
    return PanelGPAgent;
}(GPAgent_1.GPAgent));
var PanelMetabolicAgent = /** @class */ (function (_super) {
    __extends(PanelMetabolicAgent, _super);
    function PanelMetabolicAgent(id, name, llmClient) {
        var _this = _super.call(this, llmClient) || this;
        _this.id = id;
        _this.name = name;
        return _this;
    }
    return PanelMetabolicAgent;
}(MetabolicAgent_1.MetabolicAgent));
function buildPanelProviderStates(providers, env) {
    var states = [];
    var clients = [];
    for (var _i = 0, providers_1 = providers; _i < providers_1.length; _i++) {
        var provider = providers_1[_i];
        var client = (0, createClinicalLLMClient_1.createClinicalLLMClientForProvider)(provider, env);
        var enabled = Boolean(client);
        states.push({
            provider: provider,
            llmEnabled: enabled,
        });
        if (client) {
            clients.push(client);
        }
    }
    return { states: states, clients: clients };
}
function createCardiologyPanelAgents(clients) {
    var panelAgents = clients.length > 0
        ? clients.map(function (client, index) {
            return new PanelCardiologyAgent("cardio_panel_".concat(index + 1), "\u5FC3\u8840\u7BA1\u534F\u540C\u6A21\u578B-".concat(index + 1), client);
        })
        : [new PanelCardiologyAgent('cardio_panel_local', '心血管协同-本地兜底', null)];
    return panelAgents;
}
function createGPPanelAgents(clients) {
    var panelAgents = clients.length > 0
        ? clients.map(function (client, index) {
            return new PanelGPAgent("gp_panel_".concat(index + 1), "\u5168\u79D1\u534F\u540C\u6A21\u578B-".concat(index + 1), client);
        })
        : [new PanelGPAgent('gp_panel_local', '全科协同-本地兜底', null)];
    return panelAgents;
}
function createMetabolicPanelAgents(clients) {
    var panelAgents = clients.length > 0
        ? clients.map(function (client, index) {
            return new PanelMetabolicAgent("metabolic_panel_".concat(index + 1), "\u4EE3\u8C22\u534F\u540C\u6A21\u578B-".concat(index + 1), client);
        })
        : [new PanelMetabolicAgent('metabolic_panel_local', '代谢协同-本地兜底', null)];
    return panelAgents;
}
function createRuntime() {
    var env = process.env;
    var llmClients = (0, createClinicalLLMClient_1.createClinicalExpertLLMClients)();
    var assignments = (0, createClinicalLLMClient_1.resolveClinicalExpertProviderAssignments)();
    var patientContextEnricher = (0, PatientContextEnricher_1.createPatientContextEnricher)(env);
    var coordinatorSnapshotService = new CoordinatorSnapshotService_1.CoordinatorSnapshotService(env);
    var panelProviders = resolvePanelProviders(env);
    var cardioPanel = buildPanelProviderStates(panelProviders.cardiology, env);
    var gpPanel = buildPanelProviderStates(panelProviders.generalPractice, env);
    var metabolicPanel = buildPanelProviderStates(panelProviders.metabolic, env);
    var safetyOutputGuardService = new SafetyOutputGuardService_1.SafetyOutputGuardService(resolveSafetyOutputGuardConfig(env));
    var deepDebateEngine = new DebateEngine_1.DebateEngine([
        new CardiologyAgent_1.CardiologyAgent(llmClients.cardiology),
        new GPAgent_1.GPAgent(llmClients.generalPractice),
        new MetabolicAgent_1.MetabolicAgent(llmClients.metabolic),
        new SafetyAgent_1.SafetyAgent(llmClients.safety),
    ], {
        maxRounds: 3,
    });
    var fastDepartmentEngines = {
        cardiology: new DebateEngine_1.DebateEngine(createCardiologyPanelAgents(cardioPanel.clients), { maxRounds: 1 }),
        generalPractice: new DebateEngine_1.DebateEngine(createGPPanelAgents(gpPanel.clients), { maxRounds: 1 }),
        metabolic: new DebateEngine_1.DebateEngine(createMetabolicPanelAgents(metabolicPanel.clients), { maxRounds: 1 }),
    };
    var lightDepartmentEngines = {
        cardiology: new DebateEngine_1.DebateEngine(createCardiologyPanelAgents(cardioPanel.clients), { maxRounds: 2 }),
        generalPractice: new DebateEngine_1.DebateEngine(createGPPanelAgents(gpPanel.clients), { maxRounds: 2 }),
        metabolic: new DebateEngine_1.DebateEngine(createMetabolicPanelAgents(metabolicPanel.clients), { maxRounds: 2 }),
    };
    var orchestrator = new ComplexityRoutedOrchestrator_1.ComplexityRoutedOrchestrator({
        fastDepartmentEngines: fastDepartmentEngines,
        lightDepartmentEngines: lightDepartmentEngines,
        deepDebateEngine: deepDebateEngine,
        patientContextEnricher: patientContextEnricher,
        safetyOutputGuardService: safetyOutputGuardService,
    });
    var triageUseCase = new RunTriageSessionUseCase_1.RunTriageSessionUseCase(orchestrator);
    var architecture = {
        experts: {
            cardiology: {
                provider: assignments.cardiology.provider,
                source: assignments.cardiology.source,
                llmEnabled: Boolean(llmClients.cardiology),
                envKey: assignments.cardiology.envKey,
            },
            generalPractice: {
                provider: assignments.generalPractice.provider,
                source: assignments.generalPractice.source,
                llmEnabled: Boolean(llmClients.generalPractice),
                envKey: assignments.generalPractice.envKey,
            },
            metabolic: {
                provider: assignments.metabolic.provider,
                source: assignments.metabolic.source,
                llmEnabled: Boolean(llmClients.metabolic),
                envKey: assignments.metabolic.envKey,
            },
            safety: {
                provider: assignments.safety.provider,
                source: assignments.safety.source,
                llmEnabled: Boolean(llmClients.safety),
                envKey: assignments.safety.envKey,
            },
        },
        routing: {
            policyVersion: 'v4.30.chapter4',
            complexityThresholds: {
                fastConsensusMax: 2,
                lightDebateMax: 5,
                deepDebateMin: 6,
            },
            panelProviders: {
                cardiology: cardioPanel.states,
                generalPractice: gpPanel.states,
                metabolic: metabolicPanel.states,
            },
        },
    };
    return {
        triageUseCase: triageUseCase,
        architecture: architecture,
        coordinatorSnapshotService: coordinatorSnapshotService,
    };
}
