"use strict";
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
exports.MinimumInfoSetService = void 0;
function parseSymptoms(symptomText) {
    if (!symptomText) {
        return [];
    }
    return symptomText
        .split(/[,，、;；\n]+/)
        .map(function (item) { return item.trim(); })
        .filter(Boolean);
}
function pickLatestSignal(signals) {
    var _a;
    if (!signals || signals.length === 0) {
        return null;
    }
    var sorted = __spreadArray([], signals, true).sort(function (a, b) {
        var left = Date.parse(a.timestamp || '');
        var right = Date.parse(b.timestamp || '');
        if (!Number.isFinite(left) && !Number.isFinite(right)) {
            return 0;
        }
        if (!Number.isFinite(left)) {
            return -1;
        }
        if (!Number.isFinite(right)) {
            return 1;
        }
        return left - right;
    });
    return (_a = sorted[sorted.length - 1]) !== null && _a !== void 0 ? _a : null;
}
function normalizeProfile(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    var latestSignal = pickLatestSignal(input.signals);
    var symptomText = (_a = input.symptomText) === null || _a === void 0 ? void 0 : _a.trim();
    var symptomsFromText = parseSymptoms(symptomText);
    var profileSymptoms = (_b = input.profile.symptoms) !== null && _b !== void 0 ? _b : [];
    var mergedSymptoms = __spreadArray([], new Set(__spreadArray(__spreadArray([], profileSymptoms, true), symptomsFromText, true).map(function (item) { return item.trim(); })
        .filter(Boolean)), true);
    var mergedVitals = {
        systolicBP: (_d = (_c = input.profile.vitals) === null || _c === void 0 ? void 0 : _c.systolicBP) !== null && _d !== void 0 ? _d : latestSignal === null || latestSignal === void 0 ? void 0 : latestSignal.systolicBP,
        diastolicBP: (_f = (_e = input.profile.vitals) === null || _e === void 0 ? void 0 : _e.diastolicBP) !== null && _f !== void 0 ? _f : latestSignal === null || latestSignal === void 0 ? void 0 : latestSignal.diastolicBP,
        heartRate: (_h = (_g = input.profile.vitals) === null || _g === void 0 ? void 0 : _g.heartRate) !== null && _h !== void 0 ? _h : latestSignal === null || latestSignal === void 0 ? void 0 : latestSignal.heartRate,
        spo2: (_k = (_j = input.profile.vitals) === null || _j === void 0 ? void 0 : _j.spo2) !== null && _k !== void 0 ? _k : latestSignal === null || latestSignal === void 0 ? void 0 : latestSignal.spo2,
        bloodGlucose: (_m = (_l = input.profile.vitals) === null || _l === void 0 ? void 0 : _l.bloodGlucose) !== null && _m !== void 0 ? _m : latestSignal === null || latestSignal === void 0 ? void 0 : latestSignal.bloodGlucose,
        bloodLipid: (_p = (_o = input.profile.vitals) === null || _o === void 0 ? void 0 : _o.bloodLipid) !== null && _p !== void 0 ? _p : latestSignal === null || latestSignal === void 0 ? void 0 : latestSignal.bloodLipid,
    };
    var hasAnyVitalValue = Object.values(mergedVitals).some(function (value) { return typeof value === 'number' && Number.isFinite(value); });
    return __assign(__assign({}, input.profile), { chiefComplaint: ((_q = input.profile.chiefComplaint) === null || _q === void 0 ? void 0 : _q.trim()) ||
            symptomText ||
            input.profile.chiefComplaint, symptoms: mergedSymptoms, chronicDiseases: (_r = input.profile.chronicDiseases) !== null && _r !== void 0 ? _r : [], medicationHistory: (_s = input.profile.medicationHistory) !== null && _s !== void 0 ? _s : [], allergyHistory: (_t = input.profile.allergyHistory) !== null && _t !== void 0 ? _t : [], lifestyleTags: (_u = input.profile.lifestyleTags) !== null && _u !== void 0 ? _u : [], vitals: hasAnyVitalValue ? mergedVitals : input.profile.vitals });
}
var MinimumInfoSetService = /** @class */ (function () {
    function MinimumInfoSetService() {
    }
    MinimumInfoSetService.prototype.assess = function (input) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        var normalizedProfile = normalizeProfile(input);
        var requiredFields = [];
        var notes = [];
        var hasComplaintOrSymptoms = Boolean((_a = normalizedProfile.chiefComplaint) === null || _a === void 0 ? void 0 : _a.trim()) ||
            ((_c = (_b = normalizedProfile.symptoms) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0) > 0;
        if (!hasComplaintOrSymptoms) {
            requiredFields.push('symptomText');
            notes.push('缺少主诉或症状描述。');
        }
        var hasSbp = Number.isFinite((_d = normalizedProfile.vitals) === null || _d === void 0 ? void 0 : _d.systolicBP);
        var hasDbp = Number.isFinite((_e = normalizedProfile.vitals) === null || _e === void 0 ? void 0 : _e.diastolicBP);
        if (!hasSbp) {
            requiredFields.push('systolicBP');
            notes.push('缺少收缩压数据。');
        }
        if (!hasDbp) {
            requiredFields.push('diastolicBP');
            notes.push('缺少舒张压数据。');
        }
        var hasHistory = ((_g = (_f = normalizedProfile.chronicDiseases) === null || _f === void 0 ? void 0 : _f.length) !== null && _g !== void 0 ? _g : 0) > 0 ||
            ((_j = (_h = normalizedProfile.medicationHistory) === null || _h === void 0 ? void 0 : _h.length) !== null && _j !== void 0 ? _j : 0) > 0;
        if (!hasHistory) {
            requiredFields.push('chronicDiseasesOrMedicationHistory');
            notes.push('缺少关键病史或用药史。');
        }
        var hasBasicIdentity = normalizedProfile.age > 0 &&
            ['male', 'female', 'other'].includes(normalizedProfile.sex);
        if (!hasBasicIdentity) {
            requiredFields.push('ageOrSex');
            notes.push('年龄或性别信息无效。');
        }
        return {
            ok: requiredFields.length === 0,
            normalizedProfile: normalizedProfile,
            requiredFields: requiredFields,
            notes: notes,
        };
    };
    return MinimumInfoSetService;
}());
exports.MinimumInfoSetService = MinimumInfoSetService;
