"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaselineGuard = void 0;
var BaselineGuard = /** @class */ (function () {
    function BaselineGuard() {
    }
    /**
     * 运行基线守护
     * 对比 多智能体结论 (MAS) vs 规则基线 (Rule)
     */
    BaselineGuard.prototype.check = function (masOpinion, ruleRiskLevel) {
        var masLevelVal = this.riskToNumber(masOpinion.riskLevel);
        var ruleLevelVal = this.riskToNumber(ruleRiskLevel);
        var result = {
            masRiskLevel: masOpinion.riskLevel,
            ruleRiskLevel: ruleRiskLevel,
            conflictFlag: false,
            mitigationAction: 'pass'
        };
        // 1. 规则基线是安全底线
        // 如果规则判定为高危(L2/L3)，而AI判定为低危(L0/L1)，这是严重的安全隐患（漏诊风险）
        if (ruleLevelVal >= 2 && masLevelVal < 2) {
            result.conflictFlag = true;
            result.conflictReason = "\u5B89\u5168\u57FA\u7EBF\u51B2\u7A81\uFF1A\u89C4\u5219\u5224\u5B9A\u4E3A ".concat(ruleRiskLevel, "\uFF0C\u4F46AI\u5224\u5B9A\u4E3A ").concat(masOpinion.riskLevel, "\u3002\u5B58\u5728\u6F0F\u8BCA\u98CE\u9669\u3002");
            result.mitigationAction = 'force_rule'; // 强制执行规则
            return result;
        }
        // 2. AI判定过高（误诊风险），需要人工复核，但不强制降级（宁可误诊不可漏诊）
        if (masLevelVal > ruleLevelVal + 1) {
            result.conflictFlag = true;
            result.conflictReason = "\u8FC7\u5EA6\u8BCA\u65AD\u9884\u8B66\uFF1AAI\u5224\u5B9A(".concat(masOpinion.riskLevel, ") \u663E\u8457\u9AD8\u4E8E\u89C4\u5219\u57FA\u7EBF(").concat(ruleRiskLevel, ")");
            result.mitigationAction = 'flag_review';
            return result;
        }
        return result;
    };
    BaselineGuard.prototype.riskToNumber = function (level) {
        switch (level) {
            case 'L0': return 0;
            case 'L1': return 1;
            case 'L2': return 2;
            case 'L3': return 3;
            default: return 0;
        }
    };
    return BaselineGuard;
}());
exports.BaselineGuard = BaselineGuard;
