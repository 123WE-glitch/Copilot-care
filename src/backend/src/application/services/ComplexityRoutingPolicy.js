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
exports.evaluateComplexityScore = evaluateComplexityScore;
exports.decideRouting = decideRouting;
var DEPARTMENT_LABELS = {
    cardiology: '心血管',
    generalPractice: '全科',
    metabolic: '代谢',
    multiDisciplinary: '多学科',
};
var RED_FLAG_TERMS = [
    'chest pain',
    'shortness of breath',
    'syncope',
    'severe headache',
    '胸痛',
    '呼吸困难',
    '晕厥',
    '剧烈头痛',
];
var CARDIO_DISEASE_TERMS = [
    'hypertension',
    'high blood pressure',
    'coronary',
    'arrhythmia',
    'heart failure',
    '高血压',
    '冠心病',
    '心律失常',
    '心衰',
];
var METABOLIC_DISEASE_TERMS = [
    'diabetes',
    'prediabetes',
    'dyslipidemia',
    'hyperlipidemia',
    'obesity',
    'metabolic syndrome',
    '糖尿病',
    '糖耐量异常',
    '血脂异常',
    '高脂血症',
    '肥胖',
];
var CARDIO_SYMPTOM_TERMS = [
    'chest',
    'palpitation',
    'dyspnea',
    'edema',
    '胸闷',
    '胸痛',
    '心悸',
    '气促',
];
var METABOLIC_SYMPTOM_TERMS = [
    'thirst',
    'polyuria',
    'polyphagia',
    'fatigue',
    'weight loss',
    '口渴',
    '多尿',
    '乏力',
    '体重下降',
];
var CROSS_SYSTEM_TERMS = [
    'headache',
    'dizziness',
    'shortness of breath',
    '头痛',
    '头晕',
    '呼吸困难',
];
function hasAnyKeyword(text, keywords) {
    var normalized = text.toLowerCase();
    return keywords.some(function (keyword) { return normalized.includes(keyword.toLowerCase()); });
}
function hasRedFlag(profile) {
    var _a, _b, _c, _d, _e;
    var symptoms = (_a = profile.symptoms) !== null && _a !== void 0 ? _a : [];
    var symptomFlag = symptoms.some(function (item) { return hasAnyKeyword(item, RED_FLAG_TERMS); });
    var bpFlag = ((_c = (_b = profile.vitals) === null || _b === void 0 ? void 0 : _b.systolicBP) !== null && _c !== void 0 ? _c : 0) >= 180 ||
        ((_e = (_d = profile.vitals) === null || _d === void 0 ? void 0 : _d.diastolicBP) !== null && _e !== void 0 ? _e : 0) >= 110;
    return symptomFlag || bpFlag;
}
function hasRiskBoundarySignal(profile) {
    var _a, _b, _c, _d;
    if (hasRedFlag(profile)) {
        return true;
    }
    var moderateHighBp = ((_b = (_a = profile.vitals) === null || _a === void 0 ? void 0 : _a.systolicBP) !== null && _b !== void 0 ? _b : 0) >= 160 ||
        ((_d = (_c = profile.vitals) === null || _c === void 0 ? void 0 : _c.diastolicBP) !== null && _d !== void 0 ? _d : 0) >= 100;
    return moderateHighBp;
}
function isCoreInformationMissing(profile) {
    var _a, _b;
    var hasComplaint = typeof profile.chiefComplaint === 'string' &&
        profile.chiefComplaint.trim().length > 0;
    var hasSymptom = Array.isArray(profile.symptoms) && profile.symptoms.length > 0;
    var hasBloodPressure = Number.isFinite((_a = profile.vitals) === null || _a === void 0 ? void 0 : _a.systolicBP) &&
        Number.isFinite((_b = profile.vitals) === null || _b === void 0 ? void 0 : _b.diastolicBP);
    var hasHistory = (Array.isArray(profile.chronicDiseases) && profile.chronicDiseases.length > 0) ||
        (Array.isArray(profile.medicationHistory) && profile.medicationHistory.length > 0);
    return !(hasBloodPressure && hasHistory && (hasComplaint || hasSymptom));
}
function detectSymptomSystems(symptoms) {
    var cardio = 0;
    var metabolic = 0;
    var crossSystem = 0;
    for (var _i = 0, symptoms_1 = symptoms; _i < symptoms_1.length; _i++) {
        var symptom = symptoms_1[_i];
        if (hasAnyKeyword(symptom, CARDIO_SYMPTOM_TERMS)) {
            cardio += 1;
        }
        if (hasAnyKeyword(symptom, METABOLIC_SYMPTOM_TERMS)) {
            metabolic += 1;
        }
        if (hasAnyKeyword(symptom, CROSS_SYSTEM_TERMS)) {
            crossSystem += 1;
        }
    }
    return [cardio, metabolic, crossSystem].filter(function (count) { return count > 0; }).length;
}
function hasHistoryWorseningSignal(profile) {
    var _a, _b;
    var textParts = __spreadArray([(_a = profile.chiefComplaint) !== null && _a !== void 0 ? _a : ''], ((_b = profile.symptoms) !== null && _b !== void 0 ? _b : []), true);
    var text = textParts.join(' ').toLowerCase();
    return /worsen|persistent|recurrent|加重|持续|反复/.test(text);
}
function detectDepartment(profile) {
    var _a, _b, _c, _d, _e, _f;
    var diseases = (_a = profile.chronicDiseases) !== null && _a !== void 0 ? _a : [];
    var symptoms = (_b = profile.symptoms) !== null && _b !== void 0 ? _b : [];
    var cardioSignalScore = 0;
    var metabolicSignalScore = 0;
    for (var _i = 0, diseases_1 = diseases; _i < diseases_1.length; _i++) {
        var disease = diseases_1[_i];
        if (hasAnyKeyword(disease, CARDIO_DISEASE_TERMS)) {
            cardioSignalScore += 2;
        }
        if (hasAnyKeyword(disease, METABOLIC_DISEASE_TERMS)) {
            metabolicSignalScore += 2;
        }
    }
    for (var _g = 0, symptoms_2 = symptoms; _g < symptoms_2.length; _g++) {
        var symptom = symptoms_2[_g];
        if (hasAnyKeyword(symptom, CARDIO_SYMPTOM_TERMS)) {
            cardioSignalScore += 1;
        }
        if (hasAnyKeyword(symptom, METABOLIC_SYMPTOM_TERMS)) {
            metabolicSignalScore += 1;
        }
    }
    if (((_d = (_c = profile.vitals) === null || _c === void 0 ? void 0 : _c.systolicBP) !== null && _d !== void 0 ? _d : 0) >= 140 || ((_f = (_e = profile.vitals) === null || _e === void 0 ? void 0 : _e.diastolicBP) !== null && _f !== void 0 ? _f : 0) >= 90) {
        cardioSignalScore += 1;
    }
    if (cardioSignalScore === 0 && metabolicSignalScore === 0) {
        return {
            department: 'generalPractice',
            reasons: ['缺少清晰专科信号，先由全科进行首轮分诊。'],
            cardioSignalScore: cardioSignalScore,
            metabolicSignalScore: metabolicSignalScore,
        };
    }
    if (Math.abs(cardioSignalScore - metabolicSignalScore) <= 1) {
        return {
            department: 'generalPractice',
            reasons: ['心血管与代谢信号接近，先由全科进行同专业面板评估。'],
            cardioSignalScore: cardioSignalScore,
            metabolicSignalScore: metabolicSignalScore,
        };
    }
    if (metabolicSignalScore > cardioSignalScore) {
        return {
            department: 'metabolic',
            reasons: ['代谢相关信号占优，进入代谢专科协同评估。'],
            cardioSignalScore: cardioSignalScore,
            metabolicSignalScore: metabolicSignalScore,
        };
    }
    return {
        department: 'cardiology',
        reasons: ['心血管相关信号占优，进入心血管专科协同评估。'],
        cardioSignalScore: cardioSignalScore,
        metabolicSignalScore: metabolicSignalScore,
    };
}
function resolveModeByComplexity(score, forceAtLeastLightDebate) {
    if (score <= 2) {
        return forceAtLeastLightDebate ? 'LIGHT_DEBATE' : 'FAST_CONSENSUS';
    }
    if (score <= 5) {
        return 'LIGHT_DEBATE';
    }
    return 'DEEP_DEBATE';
}
function resolveCollaborationMode(mode) {
    if (mode === 'DEEP_DEBATE') {
        return 'MULTI_DISCIPLINARY_CONSULT';
    }
    if (mode === 'ESCALATE_TO_OFFLINE') {
        return 'OFFLINE_ESCALATION';
    }
    return 'SINGLE_SPECIALTY_PANEL';
}
function evaluateComplexityScore(profile) {
    var _a, _b, _c;
    var reasons = [];
    var score = 0;
    if (isCoreInformationMissing(profile)) {
        score += 2;
        reasons.push('核心信息存在缺口（主诉/血压/病史不完整）(+2)');
    }
    var symptomCount = ((_a = profile.symptoms) !== null && _a !== void 0 ? _a : []).length;
    var crossSystems = detectSymptomSystems((_b = profile.symptoms) !== null && _b !== void 0 ? _b : []);
    if (symptomCount >= 3 && crossSystems >= 2) {
        score += 2;
        reasons.push('症状数量>=3 且跨系统 (+2)');
    }
    if (((_c = profile.chronicDiseases) !== null && _c !== void 0 ? _c : []).length >= 2) {
        score += 2;
        reasons.push('慢病共病负担>=2 (+2)');
    }
    if (hasRiskBoundarySignal(profile)) {
        score += 3;
        reasons.push('触发风险边界信号（红旗或中高危阈值）(+3)');
    }
    if (hasHistoryWorseningSignal(profile)) {
        score += 1;
        reasons.push('存在趋势恶化信号 (+1)');
    }
    return { score: score, reasons: reasons };
}
function decideRouting(profile) {
    var complexity = evaluateComplexityScore(profile);
    var missingCoreInfo = isCoreInformationMissing(profile);
    if (hasRedFlag(profile)) {
        return {
            complexityScore: complexity.score,
            routeMode: 'ESCALATE_TO_OFFLINE',
            department: 'multiDisciplinary',
            collaborationMode: 'OFFLINE_ESCALATION',
            reasons: __spreadArray(['红旗边界优先触发，直接线下上转。'], complexity.reasons, true),
        };
    }
    var triageDepartment = detectDepartment(profile);
    var routeMode = resolveModeByComplexity(complexity.score, missingCoreInfo);
    var department = routeMode === 'DEEP_DEBATE' ? 'multiDisciplinary' : triageDepartment.department;
    var reasons = __spreadArray(__spreadArray([
        "\u9996\u8F6E\u5206\u8BCA\uFF1A".concat(DEPARTMENT_LABELS[triageDepartment.department], "\uFF08\u5FC3\u8840\u7BA1\u4FE1\u53F7=").concat(triageDepartment.cardioSignalScore, "\uFF0C\u4EE3\u8C22\u4FE1\u53F7=").concat(triageDepartment.metabolicSignalScore, "\uFF09")
    ], triageDepartment.reasons, true), complexity.reasons, true);
    if (missingCoreInfo) {
        reasons.push('最小信息集未补齐，禁止快速共识，至少进入轻度辩论。');
    }
    if (routeMode === 'DEEP_DEBATE') {
        reasons.push('复杂度达到深度会诊阈值，切换多学科协同。');
    }
    return {
        complexityScore: complexity.score,
        routeMode: routeMode,
        department: department,
        collaborationMode: resolveCollaborationMode(routeMode),
        reasons: reasons,
    };
}
