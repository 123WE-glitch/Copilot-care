"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLLMJsonText = parseLLMJsonText;
var VALID_RISK_LEVELS = ['L0', 'L1', 'L2', 'L3'];
function extractJsonObject(text) {
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        return null;
    }
    return text.slice(start, end + 1);
}
function stripCodeFences(text) {
    var trimmed = text.trim();
    if (!trimmed.startsWith('```')) {
        return trimmed;
    }
    return trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
}
function toStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .filter(function (item) { return typeof item === 'string'; })
        .map(function (item) { return item.trim(); })
        .filter(Boolean);
}
function toConfidence(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        var parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
}
function parseLLMJsonText(text) {
    var candidates = [];
    var stripped = stripCodeFences(text);
    var extractedFromStripped = extractJsonObject(stripped);
    if (extractedFromStripped) {
        candidates.push(extractedFromStripped);
    }
    var extractedFromRaw = extractJsonObject(text);
    if (extractedFromRaw && extractedFromRaw !== extractedFromStripped) {
        candidates.push(extractedFromRaw);
    }
    if (candidates.length === 0) {
        candidates.push(stripped);
    }
    var candidate = null;
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var candidateText = candidates_1[_i];
        try {
            candidate = JSON.parse(candidateText);
            break;
        }
        catch (_a) {
            continue;
        }
    }
    if (!candidate || typeof candidate !== 'object') {
        return null;
    }
    var source = candidate;
    var rawRiskLevel = source.riskLevel;
    var confidence = toConfidence(source.confidence);
    var reasoning = source.reasoning;
    if (typeof rawRiskLevel !== 'string') {
        return null;
    }
    var riskLevel = rawRiskLevel.toUpperCase();
    if (!VALID_RISK_LEVELS.includes(riskLevel)) {
        return null;
    }
    if (confidence === null || Number.isNaN(confidence)) {
        return null;
    }
    if (typeof reasoning !== 'string' || !reasoning.trim()) {
        return null;
    }
    return {
        riskLevel: riskLevel,
        confidence: Math.min(1, Math.max(0, confidence)),
        reasoning: reasoning.trim(),
        citations: toStringArray(source.citations),
        actions: toStringArray(source.actions),
    };
}
