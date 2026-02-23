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
exports.ExplainableReportService = void 0;
var ExplainableReportService = /** @class */ (function () {
    function ExplainableReportService() {
    }
    ExplainableReportService.prototype.build = function (input) {
        var _a, _b, _c, _d, _e, _f, _g;
        var triageLevel = input.triageResult.triageLevel;
        var conclusion = "\u5206\u8BCA\u7B49\u7EA7\uFF1A".concat(triageLevel, "\uFF1B\u53BB\u5411\uFF1A").concat(input.triageResult.destination, "\uFF1B") +
            "\u5EFA\u8BAE ".concat(input.triageResult.followupDays, " \u5929\u5185\u5B8C\u6210\u4E0B\u4E00\u6B21\u968F\u8BBF\u3002");
        var evidence = __spreadArray(__spreadArray([], ((_b = (_a = input.finalConsensus) === null || _a === void 0 ? void 0 : _a.citations) !== null && _b !== void 0 ? _b : []), true), input.additionalEvidence, true).filter(Boolean);
        var basis = __spreadArray(__spreadArray(__spreadArray([], ((_d = (_c = input.routing) === null || _c === void 0 ? void 0 : _c.reasons) !== null && _d !== void 0 ? _d : []), true), input.ruleEvidence, true), (((_e = input.finalConsensus) === null || _e === void 0 ? void 0 : _e.reasoning) ? [input.finalConsensus.reasoning] : []), true);
        var actions = __spreadArray(__spreadArray([], input.triageResult.educationAdvice, true), ((_g = (_f = input.finalConsensus) === null || _f === void 0 ? void 0 : _f.actions) !== null && _g !== void 0 ? _g : []), true);
        return {
            conclusion: conclusion,
            evidence: __spreadArray([], new Set(evidence), true),
            basis: __spreadArray([], new Set(basis), true),
            actions: __spreadArray([], new Set(actions), true),
            counterfactual: [
                '若未执行建议，风险等级可能在后续随访中上移。',
                '若按建议执行并持续监测，可降低异常未被及时识别的概率。',
            ],
        };
    };
    return ExplainableReportService;
}());
exports.ExplainableReportService = ExplainableReportService;
