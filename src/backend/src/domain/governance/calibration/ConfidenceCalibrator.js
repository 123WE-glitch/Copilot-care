"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceCalibrator = void 0;
var ConfidenceCalibrator = /** @class */ (function () {
    function ConfidenceCalibrator() {
        this.EVIDENCE_WEIGHT = 0.4;
        this.BASE_CONFIDENCE_WEIGHT = 0.6;
        this.ABSTAIN_THRESHOLD = 0.6; // 低于0.6建议拒答/转人工
    }
    ConfidenceCalibrator.prototype.calibrate = function (opinion) {
        var rawConfidence = opinion.confidence;
        // 1. 计算证据覆盖度 (简单启发式：是否有引用，引用数量)
        // 在完整版中，这里应该用RAG检索结果来验证引用是否真实存在
        var evidenceCount = opinion.citations ? opinion.citations.length : 0;
        var hasReasoning = opinion.reasoning && opinion.reasoning.length > 20;
        var evidenceScore = 0;
        if (evidenceCount > 0)
            evidenceScore += 0.5;
        if (evidenceCount >= 2)
            evidenceScore += 0.3;
        if (hasReasoning)
            evidenceScore += 0.2;
        // 归一化
        var evidenceCoverage = Math.min(evidenceScore, 1.0);
        // 2. 计算校准后置信度
        // 如果没有证据，置信度会被大幅拉低
        var calibratedConfidence = (rawConfidence * this.BASE_CONFIDENCE_WEIGHT) +
            (evidenceCoverage * this.EVIDENCE_WEIGHT);
        // 3. 拒答判断
        var abstain = calibratedConfidence < this.ABSTAIN_THRESHOLD;
        return {
            rawConfidence: rawConfidence,
            calibratedConfidence: parseFloat(calibratedConfidence.toFixed(2)),
            evidenceCoverage: evidenceCoverage,
            abstain: abstain,
            reason: abstain
                ? "\u7F6E\u4FE1\u5EA6\u6821\u51C6\u4E0D\u8DB3 (".concat(calibratedConfidence.toFixed(2), " < ").concat(this.ABSTAIN_THRESHOLD, ")\uFF0C\u7F3A\u4E4F\u5145\u5206\u8BC1\u636E\u652F\u6491\u3002")
                : '置信度校准通过'
        };
    };
    return ConfidenceCalibrator;
}());
exports.ConfidenceCalibrator = ConfidenceCalibrator;
