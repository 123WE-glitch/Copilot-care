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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMTransportError = exports.LLMHttpStatusError = void 0;
exports.postJson = postJson;
var https_1 = __importDefault(require("https"));
var RETRYABLE_HTTP_STATUS = new Set([408, 429, 500, 502, 503, 504]);
var RETRYABLE_NETWORK_CODES = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ENOTFOUND',
    'EPIPE',
]);
var LLMHttpStatusError = /** @class */ (function (_super) {
    __extends(LLMHttpStatusError, _super);
    function LLMHttpStatusError(statusCode, message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'LLMHttpStatusError';
        _this.statusCode = statusCode;
        return _this;
    }
    return LLMHttpStatusError;
}(Error));
exports.LLMHttpStatusError = LLMHttpStatusError;
var LLMTransportError = /** @class */ (function (_super) {
    __extends(LLMTransportError, _super);
    function LLMTransportError(transportCode, message, options) {
        var _this = _super.call(this, message) || this;
        _this.name = 'LLMTransportError';
        _this.transportCode = transportCode;
        if (options && 'cause' in options) {
            _this.cause = options.cause;
        }
        return _this;
    }
    return LLMTransportError;
}(Error));
exports.LLMTransportError = LLMTransportError;
function delay(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
function isRetryableError(error) {
    if (error instanceof LLMHttpStatusError) {
        return RETRYABLE_HTTP_STATUS.has(error.statusCode);
    }
    if (error instanceof LLMTransportError) {
        return error.transportCode === 'ERR_LLM_TIMEOUT';
    }
    if (error instanceof Error) {
        var networkCode = error.code;
        if (networkCode && RETRYABLE_NETWORK_CODES.has(networkCode)) {
            return true;
        }
        var normalizedMessage = error.message.toLowerCase();
        if (normalizedMessage.includes('timeout')) {
            return true;
        }
    }
    return false;
}
function postJsonSingleAttempt(options) {
    return __awaiter(this, void 0, void 0, function () {
        var target, payload;
        return __generator(this, function (_a) {
            target = new URL(options.url);
            payload = JSON.stringify(options.body);
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var request = https_1.default.request({
                        protocol: target.protocol,
                        hostname: target.hostname,
                        port: target.port ? Number(target.port) : 443,
                        path: "".concat(target.pathname).concat(target.search),
                        method: 'POST',
                        headers: __assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, options.headers),
                    }, function (response) {
                        var data = '';
                        response.setEncoding('utf8');
                        response.on('data', function (chunk) {
                            data += chunk;
                        });
                        response.on('end', function () {
                            var _a;
                            var status = (_a = response.statusCode) !== null && _a !== void 0 ? _a : 0;
                            if (status >= 400) {
                                reject(new LLMHttpStatusError(status, "LLM HTTP ".concat(status, ": ").concat(data.slice(0, 300) || 'empty body')));
                                return;
                            }
                            if (!data) {
                                resolve({});
                                return;
                            }
                            try {
                                resolve(JSON.parse(data));
                            }
                            catch (error) {
                                reject(new LLMTransportError('ERR_LLM_INVALID_JSON', "LLM response is not valid JSON: ".concat(error instanceof Error ? error.message : 'unknown error'), { cause: error }));
                            }
                        });
                    });
                    request.on('error', function (error) {
                        reject(error);
                    });
                    request.setTimeout(options.timeoutMs, function () {
                        request.destroy(new LLMTransportError('ERR_LLM_TIMEOUT', "LLM request timeout after ".concat(options.timeoutMs, "ms")));
                    });
                    request.write(payload);
                    request.end();
                })];
        });
    });
}
function postJson(options) {
    return __awaiter(this, void 0, void 0, function () {
        var maxRetries, retryDelayMs, attempt, error_1, backoffMs;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    maxRetries = Math.max(0, (_a = options.maxRetries) !== null && _a !== void 0 ? _a : 1);
                    retryDelayMs = Math.max(0, (_b = options.retryDelayMs) !== null && _b !== void 0 ? _b : 300);
                    attempt = 0;
                    _c.label = 1;
                case 1:
                    if (!(attempt <= maxRetries)) return [3 /*break*/, 7];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, postJsonSingleAttempt(options)];
                case 3: return [2 /*return*/, _c.sent()];
                case 4:
                    error_1 = _c.sent();
                    if (attempt >= maxRetries || !isRetryableError(error_1)) {
                        throw error_1;
                    }
                    backoffMs = retryDelayMs * (attempt + 1);
                    return [4 /*yield*/, delay(backoffMs)];
                case 5:
                    _c.sent();
                    attempt += 1;
                    return [3 /*break*/, 6];
                case 6: return [3 /*break*/, 1];
                case 7: throw new LLMTransportError('ERR_LLM_REQUEST_FAILED', 'LLM HTTP request failed without explicit error');
            }
        });
    });
}
