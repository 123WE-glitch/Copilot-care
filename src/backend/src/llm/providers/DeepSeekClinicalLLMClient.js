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
exports.DeepSeekClinicalLLMClient = void 0;
var http_1 = require("../http");
var normalize_1 = require("../normalize");
var prompts_1 = require("../prompts");
function extractDeepSeekText(payload) {
    if (!payload || typeof payload !== 'object') {
        return '';
    }
    var choices = payload.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
        return '';
    }
    var first = choices[0];
    if (!first || typeof first !== 'object') {
        return '';
    }
    var message = first.message;
    if (!message || typeof message !== 'object') {
        return '';
    }
    var content = message.content;
    if (typeof content !== 'string') {
        return '';
    }
    return content;
}
var DeepSeekClinicalLLMClient = /** @class */ (function () {
    function DeepSeekClinicalLLMClient(config) {
        this.config = config;
    }
    DeepSeekClinicalLLMClient.prototype.generateOpinion = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var endpoint, payload;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        endpoint = "".concat(this.config.baseUrl.replace(/\/+$/, ''), "/chat/completions");
                        return [4 /*yield*/, (0, http_1.postJson)({
                                url: endpoint,
                                timeoutMs: this.config.timeoutMs,
                                maxRetries: this.config.maxRetries,
                                retryDelayMs: this.config.retryDelayMs,
                                headers: {
                                    Authorization: "Bearer ".concat(this.config.apiKey),
                                },
                                body: {
                                    model: this.config.model,
                                    temperature: 0.1,
                                    max_tokens: 600,
                                    response_format: {
                                        type: 'json_object',
                                    },
                                    messages: [
                                        {
                                            role: 'system',
                                            content: (0, prompts_1.buildClinicalSystemPrompt)(),
                                        },
                                        {
                                            role: 'user',
                                            content: (0, prompts_1.buildClinicalUserPrompt)(input),
                                        },
                                    ],
                                },
                            })];
                    case 1:
                        payload = _a.sent();
                        return [2 /*return*/, (0, normalize_1.parseLLMJsonText)(extractDeepSeekText(payload))];
                }
            });
        });
    };
    return DeepSeekClinicalLLMClient;
}());
exports.DeepSeekClinicalLLMClient = DeepSeekClinicalLLMClient;
