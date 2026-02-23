"use strict";
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
exports.ConsentValidationService = void 0;
function parseAllowlist(envValue) {
    if (!envValue) {
        return [];
    }
    return envValue
        .split(/[,\s]+/)
        .map(function (item) { return item.trim(); })
        .filter(Boolean);
}
function isFormatValid(token) {
    if (!token.startsWith('consent_')) {
        return false;
    }
    return /^[a-zA-Z0-9_.:-]{12,}$/.test(token);
}
var ConsentValidationService = /** @class */ (function () {
    function ConsentValidationService(env) {
        if (env === void 0) { env = process.env; }
        var defaults = ['consent_local_demo'];
        var configured = parseAllowlist(env.COPILOT_CARE_CONSENT_TOKEN_ALLOWLIST);
        this.allowlist = new Set(__spreadArray(__spreadArray([], defaults, true), configured, true));
    }
    ConsentValidationService.prototype.validate = function (consentToken) {
        var token = typeof consentToken === 'string' ? consentToken.trim() : '';
        if (!token) {
            return {
                ok: false,
                errorCode: 'ERR_MISSING_REQUIRED_DATA',
                message: '缺少 consentToken，无法完成授权校验。',
                requiredFields: ['consentToken'],
            };
        }
        if (!isFormatValid(token)) {
            return {
                ok: false,
                errorCode: 'ERR_MISSING_REQUIRED_DATA',
                message: 'consentToken 格式无效。',
                requiredFields: ['consentToken'],
            };
        }
        if (!this.allowlist.has(token)) {
            return {
                ok: false,
                errorCode: 'ERR_MISSING_REQUIRED_DATA',
                message: 'consentToken 未授权。',
                requiredFields: ['consentToken'],
            };
        }
        return { ok: true };
    };
    return ConsentValidationService;
}());
exports.ConsentValidationService = ConsentValidationService;
