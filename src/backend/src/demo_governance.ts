
import { createRuntime } from './bootstrap/createRuntime';
import { TriageRequest } from '@copilot-care/shared/types';

async function runDemo() {
  // 1. 初始化运行时
  const runtime = createRuntime();
  
  // 2. 模拟一个病例：高血压，但证据不足，试图触发置信度校准
  const request: TriageRequest = {
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
  
  const result = await runtime.triageUseCase.execute(request, {
    onReasoningStep: (step) => console.log(`[推理] ${step}`),
    onWorkflowStage: (stage) => console.log(`[阶段] ${stage.stage}: ${stage.detail} (${stage.status})`)
  });

  console.log('\n✅ 会诊结束');
  console.log('----------------------------------------');
  console.log('🔍 治理层介入记录 (Governance Notes):');
  result.notes.forEach(note => {
    if (note.includes('置信度') || note.includes('基线')) {
      console.log(`👉 ${note}`);
    }
  });
  console.log('----------------------------------------');
  console.log('📊 最终状态:', result.status);
  console.log('💊 最终结论:', result.finalConsensus ? 
    `${result.finalConsensus.riskLevel} (置信度: ${result.finalConsensus.confidence})` : '无结论');
}

runDemo().catch(console.error);
