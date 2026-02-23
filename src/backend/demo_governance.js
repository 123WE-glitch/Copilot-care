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
var createRuntime_1 = require("./src/bootstrap/createRuntime");
function runDemo() {
    return __awaiter(this, void 0, void 0, function () {
        var runtime, request, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    runtime = (0, createRuntime_1.createRuntime)();
                    request = {
                        requestId: 'demo_gov_001',
                        consentToken: 'consent_local_demo',
                        symptomText: '头晕，血压有点高',
                        profile: {
                            patientId: 'p_demo',
                            age: 65,
                            sex: 'male',
                            chronicDiseases: ['Hypertension'],
                            medicationHistory: [],
                            allergyHistory: [],
                            lifestyleTags: []
                        },
                        signals: [
                            {
                                timestamp: new Date().toISOString(),
                                source: 'manual',
                                systolicBP: 150, // L1/L2 边界
                                diastolicBP: 95
                            }
                        ]
                    };
                    console.log('🚀 开始模拟会诊...');
                    console.log('📋 输入病例:', JSON.stringify(request.profile, null, 2));
                    return [4 /*yield*/, runtime.triageUseCase.execute(request, {
                            onReasoningStep: function (step) { return console.log("[\u63A8\u7406] ".concat(step)); },
                            onWorkflowStage: function (stage) { return console.log("[\u9636\u6BB5] ".concat(stage.stage, ": ").concat(stage.detail, " (").concat(stage.status, ")")); }
                        })];
                case 1:
                    result = _a.sent();
                    console.log('\n✅ 会诊结束');
                    console.log('----------------------------------------');
                    console.log('🔍 治理层介入记录 (Governance Notes):');
                    result.notes.forEach(function (note) {
                        if (note.includes('置信度') || note.includes('基线')) {
                            console.log("\uD83D\uDC49 ".concat(note));
                        }
                    });
                    console.log('----------------------------------------');
                    console.log('📊 最终状态:', result.status);
                    console.log('💊 最终结论:', result.finalConsensus ?
                        "".concat(result.finalConsensus.riskLevel, " (\u7F6E\u4FE1\u5EA6: ").concat(result.finalConsensus.confidence, ")") : '无结论');
                    return [2 /*return*/];
            }
        });
    });
}
runDemo().catch(console.error);
