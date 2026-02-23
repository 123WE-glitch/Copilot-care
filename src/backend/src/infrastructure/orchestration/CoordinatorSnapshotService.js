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
exports.CoordinatorSnapshotService = void 0;
var http_1 = require("../../llm/http");
var STAGE_ORDER = [
    'START',
    'INFO_GATHER',
    'RISK_ASSESS',
    'ROUTING',
    'DEBATE',
    'CONSENSUS',
    'REVIEW',
    'OUTPUT',
    'ESCALATION',
];
var STAGE_LABELS = {
    START: '启动',
    INFO_GATHER: '信息采集',
    RISK_ASSESS: '风险评估',
    ROUTING: '复杂度分流',
    DEBATE: '协同会诊',
    CONSENSUS: '共识收敛',
    REVIEW: '安全复核',
    OUTPUT: '输出报告',
    ESCALATION: '线下上转',
};
var STAGE_COLOR = {
    pending: '#9aa8b8',
    running: '#0e8d8f',
    blocked: '#c3472a',
    done: '#2e9156',
    failed: '#c3472a',
    skipped: '#bf8c1f',
};
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
function parseProviderChain(value) {
    var parsed = (value || 'deepseek,gemini,kimi')
        .split(/[,\|>\s]+/)
        .map(function (item) { return item.trim().toLowerCase(); })
        .filter(Boolean);
    return __spreadArray([], new Set(parsed), true);
}
function nowIso() {
    return new Date().toISOString();
}
function toTaskStatus(status) {
    if (status === 'running') {
        return 'running';
    }
    if (status === 'blocked' || status === 'failed') {
        return 'blocked';
    }
    if (status === 'done' || status === 'skipped') {
        return 'done';
    }
    return 'pending';
}
function toTaskProgress(status) {
    if (status === 'done' || status === 'skipped') {
        return 100;
    }
    if (status === 'running') {
        return 60;
    }
    if (status === 'blocked' || status === 'failed') {
        return 100;
    }
    return 0;
}
function truncate(text, max) {
    return text.length <= max ? text : "".concat(text.slice(0, max - 1), "\u2026");
}
function buildRuleTasks(stageRuntime) {
    var taskFromStage = function (taskId, roleId, roleName, objective, stage) { return ({
        taskId: taskId,
        roleId: roleId,
        roleName: roleName,
        objective: objective,
        status: toTaskStatus(stageRuntime[stage].status),
        progress: toTaskProgress(stageRuntime[stage].status),
        latestUpdate: stageRuntime[stage].message,
    }); };
    var outputStatus = stageRuntime.OUTPUT.status;
    var overallStatus = outputStatus === 'done'
        ? 'done'
        : stageRuntime.REVIEW.status === 'failed'
            ? 'blocked'
            : stageRuntime.START.status === 'pending'
                ? 'pending'
                : 'running';
    var overallProgress = outputStatus === 'done'
        ? 100
        : stageRuntime.START.status === 'pending'
            ? 0
            : Math.round((STAGE_ORDER.filter(function (stage) { return stageRuntime[stage].status !== 'pending'; })
                .length /
                STAGE_ORDER.length) *
                100);
    return [
        {
            taskId: 'task_overall_orchestration',
            roleId: 'chief_coordinator',
            roleName: '总Agent',
            objective: '拆分任务、监督时序、汇总结论',
            status: overallStatus,
            progress: overallProgress,
            latestUpdate: stageRuntime.OUTPUT.message,
        },
        taskFromStage('task_intake', 'intake_agent', '信息采集Agent', '收集症状、授权和基础体征', 'INFO_GATHER'),
        taskFromStage('task_risk', 'risk_agent', '风险评估Agent', '结合规则完成风险分级', 'RISK_ASSESS'),
        taskFromStage('task_routing', 'routing_agent', '路由Agent', '决定同专科协同或多学科会诊路径', 'ROUTING'),
        taskFromStage('task_debate', 'specialist_panel', '专家协同Panel', '基于病情复杂度完成协同推理', 'DEBATE'),
        taskFromStage('task_review', 'reviewer_agent', '安全审校Agent', '复核风险边界并阻断不安全输出', 'REVIEW'),
    ];
}
function buildRuleGraph(context) {
    var _a;
    var nodes = [];
    var edges = [];
    nodes.push({
        id: 'input',
        label: truncate(((_a = context.symptomText) === null || _a === void 0 ? void 0 : _a.trim()) || '当前需求', 24),
        kind: 'input',
        detail: context.symptomText || context.profile.chiefComplaint || '待补充',
        color: '#406c9d',
        emphasis: 1,
    });
    STAGE_ORDER.forEach(function (stage, index) {
        var state = context.stageRuntime[stage];
        nodes.push({
            id: "stage_".concat(stage.toLowerCase()),
            label: STAGE_LABELS[stage],
            kind: 'stage',
            detail: state.message,
            color: STAGE_COLOR[state.status],
            emphasis: state.status === 'running' ? 1 : 0,
        });
        if (index === 0) {
            edges.push({
                source: 'input',
                target: "stage_".concat(stage.toLowerCase()),
                label: '触发',
            });
        }
        if (index > 0) {
            edges.push({
                source: "stage_".concat(STAGE_ORDER[index - 1].toLowerCase()),
                target: "stage_".concat(stage.toLowerCase()),
            });
        }
    });
    var evidence = context.reasoning
        .filter(function (item) { return item.trim().length > 0; })
        .slice(-4);
    evidence.forEach(function (item, index) {
        var evidenceId = "evidence_".concat(index + 1);
        nodes.push({
            id: evidenceId,
            label: truncate(item, 20),
            kind: 'evidence',
            detail: item,
            color: '#2e9156',
            emphasis: 0,
        });
        edges.push({
            source: 'stage_risk_assess',
            target: evidenceId,
            style: 'dashed',
        });
        edges.push({
            source: evidenceId,
            target: 'stage_consensus',
            style: 'dashed',
        });
    });
    if (context.routeInfo) {
        nodes.push({
            id: 'route_decision',
            label: "".concat(context.routeInfo.routeMode),
            kind: 'decision',
            detail: "department=".concat(context.routeInfo.department, "; mode=").concat(context.routeInfo.collaborationMode, "; complexity=").concat(context.routeInfo.complexityScore),
            color: '#1f7b80',
            emphasis: 1,
        });
        edges.push({
            source: 'stage_routing',
            target: 'route_decision',
            label: '决策',
        });
        edges.push({
            source: 'route_decision',
            target: 'stage_debate',
        });
    }
    if (context.mcpInsights && context.mcpInsights.length > 0) {
        nodes.push({
            id: 'mcp_context',
            label: 'MCP患者云端上下文',
            kind: 'evidence',
            detail: context.mcpInsights.join('\n'),
            color: '#6b7f96',
        });
        edges.push({
            source: 'input',
            target: 'mcp_context',
            label: '补充',
            style: 'dashed',
        });
        edges.push({
            source: 'mcp_context',
            target: 'stage_risk_assess',
            style: 'dashed',
        });
    }
    nodes.push({
        id: 'coordinator',
        label: '总Agent',
        kind: 'agent',
        detail: '负责任务分配、进度监督与总结汇报',
        color: '#2f5878',
    });
    edges.push({
        source: 'coordinator',
        target: 'stage_info_gather',
        label: '分配',
    });
    edges.push({
        source: 'coordinator',
        target: 'stage_review',
        label: '审查',
    });
    edges.push({
        source: 'coordinator',
        target: 'stage_output',
        label: '汇总',
    });
    return { nodes: nodes, edges: edges };
}
function buildPhaseSummary(phase, context) {
    if (phase === 'assignment') {
        return '总Agent已完成任务拆分，信息采集与风险评估任务开始排队执行。';
    }
    if (phase === 'analysis') {
        return '总Agent正在汇总风险证据并推进复杂度分流判定。';
    }
    if (phase === 'execution') {
        return '总Agent正在监督专家协同与共识收敛过程。';
    }
    if (phase === 'synthesis') {
        return '总Agent正在整合结论、解释依据与后续行动建议。';
    }
    var finalStatus = context.finalStatus || 'OUTPUT';
    return "\u603BAgent\u5DF2\u5B8C\u6210\u6700\u7EC8\u6C47\u62A5\uFF0C\u5F53\u524D\u4F1A\u8BCA\u72B6\u6001\uFF1A".concat(finalStatus, "\u3002");
}
function extractJsonObject(text) {
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        return null;
    }
    return text.slice(start, end + 1);
}
function extractOpenAIContent(payload) {
    if (!payload || typeof payload !== 'object') {
        return '';
    }
    var choices = payload.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
        return '';
    }
    var message = choices[0].message;
    if (!message || typeof message !== 'object') {
        return '';
    }
    var content = message.content;
    return typeof content === 'string' ? content : '';
}
function extractGeminiText(payload) {
    if (!payload || typeof payload !== 'object') {
        return '';
    }
    var candidates = payload.candidates;
    if (!Array.isArray(candidates)) {
        return '';
    }
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var candidate = candidates_1[_i];
        if (!candidate || typeof candidate !== 'object') {
            continue;
        }
        var content = candidate.content;
        if (!content || typeof content !== 'object') {
            continue;
        }
        var parts = content.parts;
        if (!Array.isArray(parts)) {
            continue;
        }
        for (var _a = 0, parts_1 = parts; _a < parts_1.length; _a++) {
            var part = parts_1[_a];
            if (!part || typeof part !== 'object') {
                continue;
            }
            var text = part.text;
            if (typeof text === 'string' && text.trim()) {
                return text;
            }
        }
    }
    return '';
}
function sanitizeTaskStatus(value) {
    if (value === 'running' || value === 'done' || value === 'blocked') {
        return value;
    }
    return 'pending';
}
function sanitizeGraphNodeKind(value) {
    if (value === 'input' ||
        value === 'stage' ||
        value === 'decision' ||
        value === 'evidence' ||
        value === 'risk' ||
        value === 'output' ||
        value === 'agent') {
        return value;
    }
    return 'decision';
}
function mergeModelTasksWithFallback(modelTasks, fallbackTasks) {
    return fallbackTasks.map(function (fallbackTask) {
        var modelTask = modelTasks.find(function (candidate) {
            return candidate.taskId === fallbackTask.taskId
                || candidate.roleId === fallbackTask.roleId
                || candidate.roleName === fallbackTask.roleName;
        });
        if (!modelTask) {
            return fallbackTask;
        }
        return __assign(__assign({}, fallbackTask), { objective: modelTask.objective || fallbackTask.objective, latestUpdate: modelTask.latestUpdate || fallbackTask.latestUpdate });
    });
}
function sanitizeModelSnapshot(payload, fallback) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    var source = payload;
    var summary = typeof source.summary === 'string' && source.summary.trim()
        ? source.summary.trim()
        : fallback.summary;
    var taskCandidate = Array.isArray(source.tasks) ? source.tasks : [];
    var tasks = [];
    if (taskCandidate.length > 0) {
        taskCandidate.forEach(function (item, index) {
            if (!item || typeof item !== 'object') {
                return;
            }
            var task = item;
            var objective = typeof task.objective === 'string' && task.objective.trim()
                ? task.objective.trim()
                : '';
            if (!objective) {
                return;
            }
            var progressValue = typeof task.progress === 'number' && Number.isFinite(task.progress)
                ? task.progress
                : typeof task.progress === 'string'
                    ? Number(task.progress)
                    : 0;
            tasks.push({
                taskId: typeof task.taskId === 'string' && task.taskId.trim()
                    ? task.taskId.trim()
                    : "model_task_".concat(index + 1),
                roleId: typeof task.roleId === 'string' && task.roleId.trim()
                    ? task.roleId.trim()
                    : "model_role_".concat(index + 1),
                roleName: typeof task.roleName === 'string' && task.roleName.trim()
                    ? task.roleName.trim()
                    : "Agent-".concat(index + 1),
                objective: objective,
                status: sanitizeTaskStatus(task.status),
                progress: Math.max(0, Math.min(100, Number(progressValue) || 0)),
                latestUpdate: typeof task.latestUpdate === 'string' && task.latestUpdate.trim()
                    ? task.latestUpdate.trim()
                    : undefined,
            });
        });
    }
    var graph = source.graph && typeof source.graph === 'object'
        ? source.graph
        : null;
    var nodeCandidate = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
    var edgeCandidate = graph && Array.isArray(graph.edges) ? graph.edges : [];
    var nodes = [];
    if (nodeCandidate.length > 0) {
        nodeCandidate.forEach(function (item, index) {
            if (!item || typeof item !== 'object') {
                return;
            }
            var node = item;
            var label = typeof node.label === 'string' && node.label.trim()
                ? node.label.trim()
                : '';
            if (!label) {
                return;
            }
            nodes.push({
                id: typeof node.id === 'string' && node.id.trim()
                    ? node.id.trim()
                    : "model_node_".concat(index + 1),
                label: label,
                kind: sanitizeGraphNodeKind(node.kind),
                detail: typeof node.detail === 'string' && node.detail.trim()
                    ? node.detail.trim()
                    : undefined,
                color: typeof node.color === 'string' && node.color.trim()
                    ? node.color.trim()
                    : undefined,
                emphasis: typeof node.emphasis === 'number' && Number.isFinite(node.emphasis)
                    ? node.emphasis
                    : undefined,
            });
        });
    }
    var validNodeIdSet = new Set(nodes.map(function (node) { return node.id; }));
    var edges = [];
    if (edgeCandidate.length > 0) {
        edgeCandidate.forEach(function (item) {
            if (!item || typeof item !== 'object') {
                return;
            }
            var edge = item;
            if (typeof edge.source !== 'string' ||
                typeof edge.target !== 'string' ||
                !validNodeIdSet.has(edge.source) ||
                !validNodeIdSet.has(edge.target)) {
                return;
            }
            edges.push({
                source: edge.source,
                target: edge.target,
                label: typeof edge.label === 'string' && edge.label.trim()
                    ? edge.label.trim()
                    : undefined,
                style: edge.style === 'dashed' || edge.style === 'solid'
                    ? edge.style
                    : undefined,
                weight: typeof edge.weight === 'number' && Number.isFinite(edge.weight)
                    ? edge.weight
                    : undefined,
            });
        });
    }
    return __assign(__assign({}, fallback), { summary: summary, tasks: tasks.length > 0
            ? mergeModelTasksWithFallback(tasks, fallback.tasks)
            : fallback.tasks, graph: {
            nodes: nodes.length > 0 ? nodes : fallback.graph.nodes,
            edges: edges.length > 0 ? edges : fallback.graph.edges,
        }, source: 'model', generatedAt: nowIso() });
}
function buildPrompt(fallback, context) {
    var _a;
    return JSON.stringify({
        task: '作为总Agent，输出当前会诊任务分配与推理流程图',
        outputLanguage: 'Simplified Chinese',
        outputFormat: 'JSON only',
        constraints: [
            '禁止给出确诊与处方',
            '仅给出可解释分诊建议',
            '每个任务必须有status与progress',
        ],
        requiredSchema: {
            summary: 'string',
            tasks: [
                {
                    taskId: 'string',
                    roleId: 'string',
                    roleName: 'string',
                    objective: 'string',
                    status: 'pending|running|done|blocked',
                    progress: '0..100',
                    latestUpdate: 'string',
                },
            ],
            graph: {
                nodes: [
                    {
                        id: 'string',
                        label: 'string',
                        kind: 'input|stage|decision|evidence|risk|output|agent',
                        detail: 'string',
                        color: '#hex',
                        emphasis: 'number',
                    },
                ],
                edges: [
                    {
                        source: 'string',
                        target: 'string',
                        label: 'string',
                        style: 'solid|dashed',
                        weight: 'number',
                    },
                ],
            },
        },
        input: {
            symptomText: context.symptomText || context.profile.chiefComplaint || '',
            profile: {
                age: context.profile.age,
                sex: context.profile.sex,
                chronicDiseases: context.profile.chronicDiseases,
                medicationHistory: context.profile.medicationHistory,
                vitals: context.profile.vitals,
            },
            stageRuntime: context.stageRuntime,
            routeInfo: context.routeInfo,
            finalStatus: context.finalStatus,
            mcpInsights: (_a = context.mcpInsights) !== null && _a !== void 0 ? _a : [],
            recentReasoning: context.reasoning.slice(-8),
        },
        baselineSnapshot: fallback,
    }, null, 2);
}
function parseCoordinatorConfig(env) {
    return {
        providerChain: parseProviderChain(env.COPILOT_CARE_COORDINATOR_PROVIDER),
        timeoutMs: parsePositiveInt(env.COPILOT_CARE_COORDINATOR_TIMEOUT_MS, 240000),
        maxRetries: parsePositiveInt(env.COPILOT_CARE_COORDINATOR_MAX_RETRIES, 1),
        retryDelayMs: parsePositiveInt(env.COPILOT_CARE_COORDINATOR_RETRY_DELAY_MS, 300),
        deepseekApiKey: env.DEEPSEEK_API_KEY,
        deepseekBaseUrl: env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
        deepseekModel: env.DEEPSEEK_COORDINATOR_MODEL || env.DEEPSEEK_LLM_MODEL || 'deepseek-chat',
        geminiApiKey: env.GEMINI_API_KEY,
        geminiBaseUrl: env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
        geminiModel: env.GEMINI_COORDINATOR_MODEL || env.GEMINI_LLM_MODEL || 'gemini-2.5-flash',
        kimiApiKey: env.KIMI_API_KEY,
        kimiBaseUrl: env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
        kimiModel: env.KIMI_COORDINATOR_MODEL || env.KIMI_LLM_MODEL || 'moonshot-v1-8k',
    };
}
function requestWithOpenAICompatibleProvider(provider, config, prompt) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, model, baseUrl, endpoint, payload;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    apiKey = provider === 'deepseek' ? config.deepseekApiKey : config.kimiApiKey;
                    model = provider === 'deepseek' ? config.deepseekModel : config.kimiModel;
                    baseUrl = provider === 'deepseek' ? config.deepseekBaseUrl : config.kimiBaseUrl;
                    if (!apiKey) {
                        return [2 /*return*/, ''];
                    }
                    endpoint = "".concat(baseUrl.replace(/\/+$/, ''), "/chat/completions");
                    return [4 /*yield*/, (0, http_1.postJson)({
                            url: endpoint,
                            timeoutMs: config.timeoutMs,
                            maxRetries: config.maxRetries,
                            retryDelayMs: config.retryDelayMs,
                            headers: {
                                Authorization: "Bearer ".concat(apiKey),
                            },
                            body: {
                                model: model,
                                temperature: 0.1,
                                max_tokens: 1200,
                                response_format: {
                                    type: 'json_object',
                                },
                                messages: [
                                    {
                                        role: 'system',
                                        content: '你是医疗会诊的总Agent。只能输出JSON对象，不要Markdown，不要额外解释。',
                                    },
                                    {
                                        role: 'user',
                                        content: prompt,
                                    },
                                ],
                            },
                        })];
                case 1:
                    payload = _a.sent();
                    return [2 /*return*/, extractOpenAIContent(payload)];
            }
        });
    });
}
function requestWithGeminiProvider(config, prompt) {
    return __awaiter(this, void 0, void 0, function () {
        var model, endpoint, payload;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!config.geminiApiKey) {
                        return [2 /*return*/, ''];
                    }
                    model = encodeURIComponent(config.geminiModel);
                    endpoint = "".concat(config.geminiBaseUrl.replace(/\/+$/, ''), "/models/").concat(model, ":generateContent") +
                        "?key=".concat(encodeURIComponent(config.geminiApiKey));
                    return [4 /*yield*/, (0, http_1.postJson)({
                            url: endpoint,
                            timeoutMs: config.timeoutMs,
                            maxRetries: config.maxRetries,
                            retryDelayMs: config.retryDelayMs,
                            headers: {},
                            body: {
                                systemInstruction: {
                                    parts: [
                                        {
                                            text: '你是医疗会诊总Agent，只能输出JSON对象，不要Markdown和解释文本。',
                                        },
                                    ],
                                },
                                generationConfig: {
                                    temperature: 0.1,
                                    maxOutputTokens: 1200,
                                },
                                contents: [
                                    {
                                        role: 'user',
                                        parts: [{ text: prompt }],
                                    },
                                ],
                            },
                        })];
                case 1:
                    payload = _a.sent();
                    return [2 /*return*/, extractGeminiText(payload)];
            }
        });
    });
}
var CoordinatorSnapshotService = /** @class */ (function () {
    function CoordinatorSnapshotService(env) {
        if (env === void 0) { env = process.env; }
        this.config = parseCoordinatorConfig(env);
    }
    CoordinatorSnapshotService.prototype.createRuleSnapshot = function (context, phase) {
        var tasks = buildRuleTasks(context.stageRuntime);
        var graph = buildRuleGraph(context);
        return {
            coordinator: '总Agent',
            phase: phase,
            summary: buildPhaseSummary(phase, context),
            tasks: tasks,
            graph: graph,
            generatedAt: nowIso(),
            source: 'rule',
        };
    };
    CoordinatorSnapshotService.prototype.createModelSnapshot = function (context, phase) {
        return __awaiter(this, void 0, void 0, function () {
            var fallback, prompt, _i, _a, provider, text, candidateText, parsed, snapshot, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        fallback = this.createRuleSnapshot(context, phase);
                        prompt = buildPrompt(fallback, context);
                        _i = 0, _a = this.config.providerChain;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 10];
                        provider = _a[_i];
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 8, , 9]);
                        text = '';
                        if (!(provider === 'deepseek' || provider === 'kimi')) return [3 /*break*/, 4];
                        return [4 /*yield*/, requestWithOpenAICompatibleProvider(provider, this.config, prompt)];
                    case 3:
                        text = _c.sent();
                        return [3 /*break*/, 7];
                    case 4:
                        if (!(provider === 'gemini')) return [3 /*break*/, 6];
                        return [4 /*yield*/, requestWithGeminiProvider(this.config, prompt)];
                    case 5:
                        text = _c.sent();
                        return [3 /*break*/, 7];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        if (!text.trim()) {
                            return [3 /*break*/, 9];
                        }
                        candidateText = extractJsonObject(text) || text;
                        parsed = JSON.parse(candidateText);
                        snapshot = sanitizeModelSnapshot(parsed, fallback);
                        if (snapshot) {
                            return [2 /*return*/, snapshot];
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        _b = _c.sent();
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 1];
                    case 10: return [2 /*return*/, null];
                }
            });
        });
    };
    return CoordinatorSnapshotService;
}());
exports.CoordinatorSnapshotService = CoordinatorSnapshotService;
