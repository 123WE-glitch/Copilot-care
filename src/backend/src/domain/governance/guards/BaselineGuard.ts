import { AgentOpinion, RiskLevel } from '@copilot-care/shared/types';

export interface BaselineCheckResult {
  masRiskLevel: RiskLevel;
  ruleRiskLevel: RiskLevel;
  conflictFlag: boolean;
  conflictReason?: string;
  mitigationAction?: 'pass' | 'flag_review' | 'force_rule';
}

export class BaselineGuard {
  /**
   * 运行基线守护
   * 对比 多智能体结论 (MAS) vs 规则基线 (Rule)
   */
  public check(
    masOpinion: AgentOpinion,
    ruleRiskLevel: RiskLevel
  ): BaselineCheckResult {
    const masLevelVal = this.riskToNumber(masOpinion.riskLevel);
    const ruleLevelVal = this.riskToNumber(ruleRiskLevel);
    
    const result: BaselineCheckResult = {
      masRiskLevel: masOpinion.riskLevel,
      ruleRiskLevel: ruleRiskLevel,
      conflictFlag: false,
      mitigationAction: 'pass'
    };

    // 1. 规则基线是安全底线
    // 如果规则判定为高危(L2/L3)，而AI判定为低危(L0/L1)，这是严重的安全隐患（漏诊风险）
    if (ruleLevelVal >= 2 && masLevelVal < 2) {
      result.conflictFlag = true;
      result.conflictReason = `安全基线冲突：规则判定为 ${ruleRiskLevel}，但AI判定为 ${masOpinion.riskLevel}。存在漏诊风险。`;
      result.mitigationAction = 'force_rule'; // 强制执行规则
      return result;
    }

    // 2. AI判定过高（误诊风险），需要人工复核，但不强制降级（宁可误诊不可漏诊）
    if (masLevelVal > ruleLevelVal + 1) {
      result.conflictFlag = true;
      result.conflictReason = `过度诊断预警：AI判定(${masOpinion.riskLevel}) 显著高于规则基线(${ruleRiskLevel})`;
      result.mitigationAction = 'flag_review';
      return result;
    }

    return result;
  }

  private riskToNumber(level: RiskLevel): number {
    switch (level) {
      case 'L0': return 0;
      case 'L1': return 1;
      case 'L2': return 2;
      case 'L3': return 3;
      default: return 0;
    }
  }
}
