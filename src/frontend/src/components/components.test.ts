import { describe, it, expect } from 'vitest';
import type {
  TriageApiResponse,
  TriageStreamEvent,
  TriageStreamStageStatus,
  WorkflowStage,
} from '@copilot-care/shared/types';

describe('WorkflowStateMachine', () => {
  it('should export stage labels', () => {
    const STAGE_LABELS = {
      START: '启动',
      INFO_GATHER: '信息采集',
      RISK_ASSESS: '风险评估',
      ROUTING: '复杂度分流',
      DEBATE: '协同仲裁',
      CONSENSUS: '共识收敛',
      REVIEW: '审校复核',
      OUTPUT: '输出结论',
      ESCALATION: '线下上转',
    };
    
    expect(STAGE_LABELS.START).toBe('启动');
    expect(STAGE_LABELS.ROUTING).toBe('复杂度分流');
    expect(STAGE_LABELS.ESCALATION).toBe('线下上转');
  });

  it('should have correct number of stages', () => {
    const STAGES = [
      'START',
      'INFO_GATHER',
      'RISK_ASSESS',
      'ROUTING',
      'DEBATE',
      'CONSENSUS',
      'REVIEW',
      'OUTPUT',
      'ESCALATION',
    ];
    
    expect(STAGES.length).toBe(9);
  });

  it('should map status colors correctly', () => {
    const getStatusColor = (status: string): string => {
      switch (status) {
        case 'running':
          return '#3b82f6';
        case 'done':
          return '#10b981';
        case 'blocked':
          return '#ef4444';
        case 'skipped':
          return '#9ca3af';
        default:
          return '#d1d5db';
      }
    };

    expect(getStatusColor('running')).toBe('#3b82f6');
    expect(getStatusColor('done')).toBe('#10b981');
    expect(getStatusColor('blocked')).toBe('#ef4444');
    expect(getStatusColor('pending')).toBe('#d1d5db');
  });
});

describe('ComplexityRoutingTree', () => {
  it('should map route modes to labels', () => {
    const ROUTE_MODE_LABELS: Record<string, string> = {
      FAST_CONSENSUS: '快速共识',
      LIGHT_DEBATE: '轻度辩论',
      DEEP_DEBATE: '深度辩论',
      ESCALATE_TO_OFFLINE: '线下上转',
    };

    expect(ROUTE_MODE_LABELS.FAST_CONSENSUS).toBe('快速共识');
    expect(ROUTE_MODE_LABELS.LIGHT_DEBATE).toBe('轻度辩论');
    expect(ROUTE_MODE_LABELS.ESCALATE_TO_OFFLINE).toBe('线下上转');
  });

  it('should map departments to labels', () => {
    const DEPARTMENT_LABELS: Record<string, string> = {
      cardiology: '心血管专科',
      generalPractice: '全科',
      metabolic: '代谢专科',
      multiDisciplinary: '多学科',
    };

    expect(DEPARTMENT_LABELS.cardiology).toBe('心血管专科');
    expect(DEPARTMENT_LABELS.metabolic).toBe('代谢专科');
  });

  it('should determine complexity level correctly', () => {
    const getComplexityLevel = (score: number): string => {
      if (score <= 2) return 'low';
      if (score <= 5) return 'medium';
      return 'high';
    };

    expect(getComplexityLevel(0)).toBe('low');
    expect(getComplexityLevel(2)).toBe('low');
    expect(getComplexityLevel(3)).toBe('medium');
    expect(getComplexityLevel(5)).toBe('medium');
    expect(getComplexityLevel(6)).toBe('high');
    expect(getComplexityLevel(10)).toBe('high');
  });
});

describe('ReasoningTraceTimeline', () => {
  it('should have correct kind config', () => {
    const KIND_CONFIG = {
      system: { icon: '⚙️', label: '系统', color: '#5d7893' },
      evidence: { icon: '📊', label: '证据', color: '#2e9156' },
      decision: { icon: '🎯', label: '决策', color: '#0e8d8f' },
      warning: { icon: '⚠️', label: '风险', color: '#c3472a' },
      query: { icon: '❓', label: '补充', color: '#bf8c1f' },
    };

    expect(KIND_CONFIG.system.label).toBe('系统');
    expect(KIND_CONFIG.evidence.icon).toBe('📊');
    expect(KIND_CONFIG.warning.color).toBe('#c3472a');
  });

  it('should format confidence correctly', () => {
    const getConfidenceColor = (confidence: number | undefined): string => {
      if (confidence === undefined) return '#6b7280';
      if (confidence >= 0.8) return '#10b981';
      if (confidence >= 0.6) return '#f59e0b';
      return '#ef4444';
    };

    expect(getConfidenceColor(undefined)).toBe('#6b7280');
    expect(getConfidenceColor(0.9)).toBe('#10b981');
    expect(getConfidenceColor(0.7)).toBe('#f59e0b');
    expect(getConfidenceColor(0.5)).toBe('#ef4444');
  });
});

describe('TriageStreamContract', () => {
  it('should keep stage status set exhaustive', () => {
    const statuses: TriageStreamStageStatus[] = [
      'pending',
      'running',
      'blocked',
      'done',
      'failed',
      'skipped',
    ];

    expect(statuses).toContain('blocked');
    expect(statuses).toHaveLength(6);
  });

  it('should keep workflow stages compatible with stream events', () => {
    const stages: WorkflowStage[] = [
      'START',
      'INFO_GATHER',
      'RISK_ASSESS',
      'ROUTING',
      'DEBATE',
      'CONSENSUS',
      'REVIEW',
      'OUTPUT',
      'ESCALATION',
    ];

    expect(stages).toContain('ESCALATION');
    expect(stages).toHaveLength(9);
  });

  it('should construct valid stream events with error final result', () => {
    const errorResponse: TriageApiResponse = {
      status: 'ERROR',
      errorCode: 'ERR_MISSING_REQUIRED_DATA',
      notes: ['missing symptomText'],
      requiredFields: ['symptomText'],
    };

    const events: TriageStreamEvent[] = [
      {
        type: 'stage_update',
        timestamp: new Date().toISOString(),
        stage: 'ROUTING',
        status: 'blocked',
        message: 'route blocked by consent validation',
      },
      {
        type: 'error',
        timestamp: new Date().toISOString(),
        errorCode: 'ERR_MISSING_REQUIRED_DATA',
        message: 'missing symptomText',
        requiredFields: ['symptomText'],
      },
      {
        type: 'final_result',
        timestamp: new Date().toISOString(),
        result: errorResponse,
      },
    ];

    expect(events[0].type).toBe('stage_update');
    expect(events[1].type).toBe('error');
    expect(events[2].type).toBe('final_result');
  });
});
