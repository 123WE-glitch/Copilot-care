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
exports.SafetyAgent = void 0;
var AgentBase_1 = require("./AgentBase");
function hasRedFlag(profile) {
    var _a, _b, _c, _d, _e;
    var symptoms = (_a = profile.symptoms) !== null && _a !== void 0 ? _a : [];
    var redFlagTerms = [
        '胸痛',
        '呼吸困难',
        '晕厥',
        '剧烈头痛',
        'chest pain',
        'shortness of breath',
        'syncope',
        'severe headache',
    ];
    var symptomFlag = symptoms.some(function (symptom) {
        var normalized = symptom.toLowerCase();
        return redFlagTerms.some(function (term) { return normalized.includes(term.toLowerCase()); });
    });
    var bpFlag = ((_c = (_b = profile.vitals) === null || _b === void 0 ? void 0 : _b.systolicBP) !== null && _c !== void 0 ? _c : 0) >= 180 ||
        ((_e = (_d = profile.vitals) === null || _d === void 0 ? void 0 : _d.diastolicBP) !== null && _e !== void 0 ? _e : 0) >= 110;
    return symptomFlag || bpFlag;
}
var SafetyAgent = /** @class */ (function (_super) {
    __extends(SafetyAgent, _super);
    function SafetyAgent(llmClient) {
        var _this = _super.call(this, 'safety_01', '安全审查代理', 'Safety') || this;
        _this.llmClient = llmClient !== null && llmClient !== void 0 ? llmClient : null;
        return _this;
    }
    SafetyAgent.prototype.buildFallbackOpinion = function (profile) {
        if (hasRedFlag(profile)) {
            return {
                agentId: this.id,
                agentName: this.name,
                role: this.role,
                riskLevel: 'L3',
                confidence: 0.95,
                reasoning: '检测到红旗信号或极高血压阈值，需优先确保安全并立即线下升级。',
                citations: ['安全红旗规则集'],
                actions: [
                    '建议立即线下急诊或紧急门诊评估',
                    '停止线上继续诊断，优先保障患者安全',
                ],
            };
        }
        return {
            agentId: this.id,
            agentName: this.name,
            role: this.role,
            riskLevel: 'L1',
            confidence: 0.82,
            reasoning: '未检出明确红旗信号，建议保持保守随访与风险监测。',
            citations: ['基础分诊安全边界规则'],
            actions: [
                '继续观察症状变化并定期复查',
                '出现胸痛、晕厥或呼吸困难时立即线下就医',
            ],
        };
    };
    SafetyAgent.prototype.think = function (profile, context) {
        return __awaiter(this, void 0, void 0, function () {
            var fallback, llmOpinion, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        fallback = this.buildFallbackOpinion(profile);
                        if (!this.llmClient) {
                            return [2 /*return*/, fallback];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.llmClient.generateOpinion({
                                role: this.role,
                                agentName: this.name,
                                focus: '安全红旗识别、风险边界审查与保守升级建议',
                                profile: profile,
                                context: context,
                            })];
                    case 2:
                        llmOpinion = _b.sent();
                        if (!llmOpinion) {
                            return [2 /*return*/, fallback];
                        }
                        return [2 /*return*/, __assign({ agentId: this.id, agentName: this.name, role: this.role }, llmOpinion)];
                    case 3:
                        _a = _b.sent();
                        return [2 /*return*/, fallback];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return SafetyAgent;
}(AgentBase_1.AgentBase));
exports.SafetyAgent = SafetyAgent;
