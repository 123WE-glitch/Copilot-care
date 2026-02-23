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
exports.GeminiClinicalLLMClient = void 0;
var http_1 = require("../http");
var normalize_1 = require("../normalize");
var prompts_1 = require("../prompts");
function extractGeminiText(payload) {
    if (!payload || typeof payload !== 'object') {
        return '';
    }
    var candidates = payload.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
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
var GeminiClinicalLLMClient = /** @class */ (function () {
    function GeminiClinicalLLMClient(config) {
        this.config = config;
    }
    GeminiClinicalLLMClient.prototype.generateOpinion = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var base, model, endpoint, payload;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        base = this.config.baseUrl.replace(/\/+$/, '');
                        model = encodeURIComponent(this.config.model);
                        endpoint = "".concat(base, "/models/").concat(model, ":generateContent?key=").concat(encodeURIComponent(this.config.apiKey));
                        return [4 /*yield*/, (0, http_1.postJson)({
                                url: endpoint,
                                timeoutMs: this.config.timeoutMs,
                                maxRetries: this.config.maxRetries,
                                retryDelayMs: this.config.retryDelayMs,
                                headers: {},
                                body: {
                                    systemInstruction: {
                                        parts: [{ text: (0, prompts_1.buildClinicalSystemPrompt)() }],
                                    },
                                    generationConfig: {
                                        temperature: 0.1,
                                        maxOutputTokens: 600,
                                    },
                                    contents: [
                                        {
                                            role: 'user',
                                            parts: [{ text: (0, prompts_1.buildClinicalUserPrompt)(input) }],
                                        },
                                    ],
                                },
                            })];
                    case 1:
                        payload = _a.sent();
                        return [2 /*return*/, (0, normalize_1.parseLLMJsonText)(extractGeminiText(payload))];
                }
            });
        });
    };
    return GeminiClinicalLLMClient;
}());
exports.GeminiClinicalLLMClient = GeminiClinicalLLMClient;
