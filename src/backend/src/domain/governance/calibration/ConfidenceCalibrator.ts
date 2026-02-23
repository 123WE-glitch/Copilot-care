import { AgentOpinion } from '@copilot-care/shared/types';

export interface CalibrationResult {
  rawConfidence: number;
  calibratedConfidence: number;
  evidenceCoverage: number;
  abstain: boolean; // 是否建议拒答
  reason: string;
}

export class ConfidenceCalibrator {
  private readonly EVIDENCE_WEIGHT = 0.4;
  private readonly BASE_CONFIDENCE_WEIGHT = 0.6;
  private readonly ABSTAIN_THRESHOLD = 0.6; // 低于0.6建议拒答/转人工

  public calibrate(opinion: AgentOpinion): CalibrationResult {
    const rawConfidence = opinion.confidence;
    
    // 1. 计算证据覆盖度 (简单启发式：是否有引用，引用数量)
    // 在完整版中，这里应该用RAG检索结果来验证引用是否真实存在
    const evidenceCount = opinion.citations ? opinion.citations.length : 0;
    const hasReasoning = opinion.reasoning && opinion.reasoning.length > 20;
    
    let evidenceScore = 0;
    if (evidenceCount > 0) evidenceScore += 0.5;
    if (evidenceCount >= 2) evidenceScore += 0.3;
    if (hasReasoning) evidenceScore += 0.2;
    
    // 归一化
    const evidenceCoverage = Math.min(evidenceScore, 1.0);

    // 2. 计算校准后置信度
    // 如果没有证据，置信度会被大幅拉低
    const calibratedConfidence = (rawConfidence * this.BASE_CONFIDENCE_WEIGHT) + 
                                 (evidenceCoverage * this.EVIDENCE_WEIGHT);

    // 3. 拒答判断
    const abstain = calibratedConfidence < this.ABSTAIN_THRESHOLD;

    return {
      rawConfidence,
      calibratedConfidence: parseFloat(calibratedConfidence.toFixed(2)),
      evidenceCoverage,
      abstain,
      reason: abstain 
        ? `置信度校准不足 (${calibratedConfidence.toFixed(2)} < ${this.ABSTAIN_THRESHOLD})，缺乏充分证据支撑。` 
        : '置信度校准通过'
    };
  }
}
