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
exports.RuleFirstRiskAssessmentService = void 0;
var RequestValidationError_1 = require("../errors/RequestValidationError");
var RED_FLAG_TERMS = [
    'chest pain',
    'shortness of breath',
    'syncope',
    'severe headache',
    'neurological deficit',
    'hurt myself',
    'suicide',
    'kill myself',
    'die',
    '胸痛',
    '呼吸困难',
    '晕厥',
    '剧烈头痛',
    '神经功能缺损',
];
function hasRedFlagBySymptoms(profile) {
    var _a;
    var symptoms = (_a = profile.symptoms) !== null && _a !== void 0 ? _a : [];
    return symptoms.some(function (symptom) {
        var normalized = symptom.toLowerCase();
        return RED_FLAG_TERMS.some(function (term) { return normalized.includes(term.toLowerCase()); });
    });
}
function hasRedFlagBySignals(signals) {
    return signals.some(function (signal) {
        var _a, _b;
        return ((_a = signal.systolicBP) !== null && _a !== void 0 ? _a : 0) >= 180 || ((_b = signal.diastolicBP) !== null && _b !== void 0 ? _b : 0) >= 110;
    });
}
function mapRiskToTriageLevel(riskLevel) {
    if (riskLevel === 'L3') {
        return 'emergency';
    }
    if (riskLevel === 'L2') {
        return 'urgent';
    }
    if (riskLevel === 'L1') {
        return 'routine';
    }
    return 'followup';
}
var RuleFirstRiskAssessmentService = /** @class */ (function () {
    function RuleFirstRiskAssessmentService() {
    }
    RuleFirstRiskAssessmentService.prototype.evaluate = function (profile, signals) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (signals === void 0) { signals = []; }
        var evidence = [];
        var guidelineBasis = [
            '高血压分级与风险分层规则（第5章模块B）',
            '红旗短路优先原则（第3章与第4章）',
        ];
        var systolic = (_b = (_a = profile.vitals) === null || _a === void 0 ? void 0 : _a.systolicBP) !== null && _b !== void 0 ? _b : (_c = __spreadArray([], signals, true).reverse()
            .find(function (signal) { return Number.isFinite(signal.systolicBP); })) === null || _c === void 0 ? void 0 : _c.systolicBP;
        var diastolic = (_e = (_d = profile.vitals) === null || _d === void 0 ? void 0 : _d.diastolicBP) !== null && _e !== void 0 ? _e : (_f = __spreadArray([], signals, true).reverse()
            .find(function (signal) { return Number.isFinite(signal.diastolicBP); })) === null || _f === void 0 ? void 0 : _f.diastolicBP;
        if (Number.isFinite(systolic) &&
            Number.isFinite(diastolic) &&
            (systolic !== null && systolic !== void 0 ? systolic : 0) < (diastolic !== null && diastolic !== void 0 ? diastolic : 0)) {
            throw new RequestValidationError_1.RequestValidationError('ERR_INVALID_VITAL_SIGN', '收缩压不能低于舒张压。');
        }
        var redFlagTriggered = hasRedFlagBySymptoms(profile) ||
            hasRedFlagBySignals(signals) ||
            (systolic !== null && systolic !== void 0 ? systolic : 0) >= 180 ||
            (diastolic !== null && diastolic !== void 0 ? diastolic : 0) >= 110;
        if (redFlagTriggered) {
            evidence.push('触发红旗症状或危急血压阈值。');
            return {
                riskLevel: 'L3',
                triageLevel: 'emergency',
                redFlagTriggered: true,
                evidence: evidence,
                guidelineBasis: guidelineBasis,
            };
        }
        var hasMultiComorbidity = ((_g = profile.chronicDiseases) !== null && _g !== void 0 ? _g : []).length >= 2;
        var hasPersistentSymptoms = ((_h = profile.symptoms) !== null && _h !== void 0 ? _h : []).length >= 3;
        if ((systolic !== null && systolic !== void 0 ? systolic : 0) >= 160 || (diastolic !== null && diastolic !== void 0 ? diastolic : 0) >= 100 || hasMultiComorbidity) {
            evidence.push('血压达到中高风险区间或存在多病共存。');
            return {
                riskLevel: 'L2',
                triageLevel: mapRiskToTriageLevel('L2'),
                redFlagTriggered: false,
                evidence: evidence,
                guidelineBasis: guidelineBasis,
            };
        }
        if ((systolic !== null && systolic !== void 0 ? systolic : 0) >= 140 || (diastolic !== null && diastolic !== void 0 ? diastolic : 0) >= 90 || hasPersistentSymptoms) {
            evidence.push('血压轻中度升高或症状持续。');
            return {
                riskLevel: 'L1',
                triageLevel: mapRiskToTriageLevel('L1'),
                redFlagTriggered: false,
                evidence: evidence,
                guidelineBasis: guidelineBasis,
            };
        }
        evidence.push('未见明确高风险边界信号，进入常规管理路径。');
        return {
            riskLevel: 'L0',
            triageLevel: mapRiskToTriageLevel('L0'),
            redFlagTriggered: false,
            evidence: evidence,
            guidelineBasis: guidelineBasis,
        };
    };
    return RuleFirstRiskAssessmentService;
}());
exports.RuleFirstRiskAssessmentService = RuleFirstRiskAssessmentService;
