import { computed, ref, type Ref } from 'vue';
import type {
  ExplainableReport,
  OrchestrationSnapshot,
  TriageRoutingInfo,
} from '@copilot-care/shared/types';
import type { ConsultationReasoningKind } from './useConsultationCharts';

interface RoutingPreviewState {
  routeMode?: string;
  department?: string;
  collaborationMode?: string;
  complexityScore?: number;
}

interface ReasoningItem {
  kind: ConsultationReasoningKind;
  text: string;
}

interface UseDecisionReasoningCockpitOptions {
  routeInfo: Ref<TriageRoutingInfo | null>;
  routingPreview: Ref<RoutingPreviewState>;
  explainableReport: Ref<ExplainableReport | null>;
  reasoningItems: Ref<ReasoningItem[]>;
  orchestrationSnapshot: Ref<OrchestrationSnapshot | null>;
  routeModeLabels: Record<string, string>;
}

export interface CockpitContributionCard {
  id: 'routing' | 'evidence' | 'consensus' | 'safety';
  label: string;
  score: number;
  summary: string;
}

export interface CockpitConfidenceBadge {
  level: 'high' | 'medium' | 'low';
  label: string;
  value: number;
  percentText: string;
  description: string;
}

export interface CockpitEvidenceDigest {
  total: number;
  items: string[];
  summary: string;
}

export interface CockpitSimulationPreset {
  id: string;
  label: string;
  description: string;
  projectedRouteMode: string;
  projectedComplexity: number;
}

export interface UseDecisionReasoningCockpitState {
  confidenceBadge: Ref<CockpitConfidenceBadge>;
  contributionCards: Ref<CockpitContributionCard[]>;
  evidenceDigest: Ref<CockpitEvidenceDigest>;
  simulationPresets: CockpitSimulationPreset[];
  selectedSimulationId: Ref<string | null>;
  simulationInsight: Ref<string>;
  toggleSimulation: (presetId: string) => void;
}

const SIMULATION_PRESETS: CockpitSimulationPreset[] = [
  {
    id: 'stable-vitals',
    label: '生命体征稳定',
    description: '假设血压回落且症状持续缓解，观察分流是否降级。',
    projectedRouteMode: 'FAST_CONSENSUS',
    projectedComplexity: 2.1,
  },
  {
    id: 'risk-escalation',
    label: '风险进行性上升',
    description: '假设出现新风险信号，验证是否需要更深层协同。',
    projectedRouteMode: 'DEEP_DEBATE',
    projectedComplexity: 6.4,
  },
  {
    id: 'red-flag',
    label: '红旗症状触发',
    description: '假设出现红旗症状，验证上转边界是否清晰。',
    projectedRouteMode: 'ESCALATE_TO_OFFLINE',
    projectedComplexity: 8.8,
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toScore(value: number): number {
  return Math.round(clamp(value, 0, 1) * 100);
}

function dedupeTexts(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    output.push(trimmed);
  }
  return output;
}

function resolveRouteMode(
  routeInfo: TriageRoutingInfo | null,
  routingPreview: RoutingPreviewState,
): string | undefined {
  return routeInfo?.routeMode ?? routingPreview.routeMode;
}

function formatRouteMode(
  routeMode: string | undefined,
  labels: Record<string, string>,
): string {
  if (!routeMode) {
    return '待判定';
  }
  return labels[routeMode] ?? routeMode;
}

function countWarnings(
  routeInfo: TriageRoutingInfo | null,
  reasoningItems: ReasoningItem[],
): number {
  const warningCount = reasoningItems.filter((item) => item.kind === 'warning').length;
  if (routeInfo?.routeMode === 'ESCALATE_TO_OFFLINE') {
    return warningCount + 1;
  }
  return warningCount;
}

function calculateConsensusStrength(snapshot: OrchestrationSnapshot | null): number {
  if (!snapshot || snapshot.tasks.length === 0) {
    return 0.45;
  }

  const total = snapshot.tasks.length;
  const done = snapshot.tasks.filter((task) => task.status === 'done').length;
  const running = snapshot.tasks.filter((task) => task.status === 'running').length;
  const blocked = snapshot.tasks.filter((task) => task.status === 'blocked').length;

  return clamp(
    0.35 + (done / total) * 0.55 + (running / total) * 0.1 - (blocked / total) * 0.45,
    0,
    1,
  );
}

function calculateEvidenceStrength(
  report: ExplainableReport | null,
  reasoningItems: ReasoningItem[],
): number {
  const reportEvidence = report
    ? [...(report.evidence ?? []), ...(report.basis ?? [])]
    : [];
  const reasoningEvidence = reasoningItems
    .filter((item) => item.kind === 'evidence')
    .map((item) => item.text);
  const evidenceCount = dedupeTexts([...reportEvidence, ...reasoningEvidence]).length;
  return clamp(evidenceCount / 6, 0, 1);
}

function calculateCompleteness(
  routeInfo: TriageRoutingInfo | null,
  routingPreview: RoutingPreviewState,
): number {
  const routeMode = routeInfo?.routeMode ?? routingPreview.routeMode;
  const department = routeInfo?.department ?? routingPreview.department;
  const collaborationMode =
    routeInfo?.collaborationMode ?? routingPreview.collaborationMode;
  const complexity = routeInfo?.complexityScore ?? routingPreview.complexityScore;

  const known = [
    routeMode,
    department,
    collaborationMode,
    typeof complexity === 'number' ? complexity : undefined,
  ].filter((value) => value !== undefined).length;

  return known / 4;
}

function calculateRiskPenalty(
  warningCount: number,
  routeMode: string | undefined,
): number {
  let penalty = Math.min(warningCount * 0.08, 0.32);
  if (routeMode === 'ESCALATE_TO_OFFLINE') {
    penalty += 0.16;
  }
  return clamp(penalty, 0, 0.45);
}

function createFallbackCard(
  id: CockpitContributionCard['id'],
  label: string,
): CockpitContributionCard {
  return {
    id,
    label,
    score: 0,
    summary: '等待会诊数据输入。',
  };
}

export function useDecisionReasoningCockpit(
  options: UseDecisionReasoningCockpitOptions,
): UseDecisionReasoningCockpitState {
  const selectedSimulationId = ref<string | null>(null);

  const evidenceDigest = computed<CockpitEvidenceDigest>(() => {
    const report = options.explainableReport.value;
    const reportEvidence = report
      ? [...(report.evidence ?? []), ...(report.basis ?? [])]
      : [];
    const reasoningEvidence = options.reasoningItems.value
      .filter((item) => item.kind === 'evidence')
      .map((item) => item.text);
    const items = dedupeTexts([...reportEvidence, ...reasoningEvidence]);
    const visibleItems = items.slice(0, 4);

    if (items.length === 0) {
      return {
        total: 0,
        items: [],
        summary: '暂无关键证据，提交会诊后自动生成证据摘要。',
      };
    }

    return {
      total: items.length,
      items: visibleItems,
      summary: `已提炼 ${items.length} 条关键证据，当前展示前 ${visibleItems.length} 条。`,
    };
  });

  const confidenceBadge = computed<CockpitConfidenceBadge>(() => {
    const routeInfo = options.routeInfo.value;
    const preview = options.routingPreview.value;
    const routeMode = resolveRouteMode(routeInfo, preview);
    const warningCount = countWarnings(routeInfo, options.reasoningItems.value);

    const completeness = calculateCompleteness(routeInfo, preview);
    const evidenceStrength = calculateEvidenceStrength(
      options.explainableReport.value,
      options.reasoningItems.value,
    );
    const consensusStrength = calculateConsensusStrength(
      options.orchestrationSnapshot.value,
    );
    const riskPenalty = calculateRiskPenalty(warningCount, routeMode);

    const confidenceValue = clamp(
      0.34
        + completeness * 0.22
        + evidenceStrength * 0.28
        + consensusStrength * 0.24
        - riskPenalty * 0.5,
      0.08,
      0.96,
    );

    let level: CockpitConfidenceBadge['level'] = 'low';
    let label = '低置信';
    if (confidenceValue >= 0.75) {
      level = 'high';
      label = '高置信';
    } else if (confidenceValue >= 0.55) {
      level = 'medium';
      label = '中置信';
    }

    const routeLabel = formatRouteMode(routeMode, options.routeModeLabels);
    const description = `当前路由：${routeLabel}。证据完整度 ${toScore(
      evidenceStrength,
    )}% ，协同一致性 ${toScore(consensusStrength)}%。`;

    return {
      level,
      label,
      value: confidenceValue,
      percentText: `${Math.round(confidenceValue * 100)}%`,
      description,
    };
  });

  const contributionCards = computed<CockpitContributionCard[]>(() => {
    const routeInfo = options.routeInfo.value;
    const preview = options.routingPreview.value;
    const routeMode = resolveRouteMode(routeInfo, preview);
    const routeLabel = formatRouteMode(routeMode, options.routeModeLabels);
    const warningCount = countWarnings(routeInfo, options.reasoningItems.value);

    const completeness = calculateCompleteness(routeInfo, preview);
    const reasonStrength = clamp((routeInfo?.reasons.length ?? 0) / 4, 0, 1);
    const evidenceStrength = calculateEvidenceStrength(
      options.explainableReport.value,
      options.reasoningItems.value,
    );
    const consensusStrength = calculateConsensusStrength(
      options.orchestrationSnapshot.value,
    );
    const riskPenalty = calculateRiskPenalty(warningCount, routeMode);

    const routingScore = clamp(completeness * 0.7 + reasonStrength * 0.3, 0, 1);
    const safetyScore = clamp(1 - riskPenalty / 0.45, 0, 1);

    const snapshot = options.orchestrationSnapshot.value;
    const blockedCount = snapshot
      ? snapshot.tasks.filter((task) => task.status === 'blocked').length
      : 0;
    const doneCount = snapshot
      ? snapshot.tasks.filter((task) => task.status === 'done').length
      : 0;
    const totalTasks = snapshot?.tasks.length ?? 0;

    return [
      routeMode
        ? {
            id: 'routing',
            label: '分流判定贡献',
            score: toScore(routingScore),
            summary: `${routeLabel}，${routeInfo?.reasons.length ?? 0} 条路由依据。`,
          }
        : createFallbackCard('routing', '分流判定贡献'),
      evidenceDigest.value.total > 0
        ? {
            id: 'evidence',
            label: '证据充分性',
            score: toScore(evidenceStrength),
            summary: evidenceDigest.value.items.slice(0, 1)[0] ?? '已提炼证据。',
          }
        : createFallbackCard('evidence', '证据充分性'),
      snapshot
        ? {
            id: 'consensus',
            label: '协同一致性',
            score: toScore(consensusStrength),
            summary: `任务完成 ${doneCount}/${totalTasks}，阻塞 ${blockedCount}。`,
          }
        : createFallbackCard('consensus', '协同一致性'),
      {
        id: 'safety',
        label: '安全约束影响',
        score: toScore(safetyScore),
        summary:
          warningCount > 0
            ? `检测到 ${warningCount} 条风险信号，已计入置信惩罚。`
            : '未检测到高风险阻断信号。',
      },
    ];
  });

  const simulationInsight = computed<string>(() => {
    const selected = SIMULATION_PRESETS.find(
      (preset) => preset.id === selectedSimulationId.value,
    );
    if (!selected) {
      return '可点击场景按钮，预估复杂度变化与路由边界偏移。';
    }

    const routeInfo = options.routeInfo.value;
    const preview = options.routingPreview.value;
    const currentRouteMode = resolveRouteMode(routeInfo, preview);
    const currentComplexity =
      routeInfo?.complexityScore ?? preview.complexityScore;
    const projectedLabel = formatRouteMode(
      selected.projectedRouteMode,
      options.routeModeLabels,
    );
    const currentLabel = formatRouteMode(currentRouteMode, options.routeModeLabels);

    const routeShiftText =
      currentRouteMode && currentRouteMode !== selected.projectedRouteMode
        ? `路由预计从 ${currentLabel} 变为 ${projectedLabel}`
        : `路由预计保持 ${projectedLabel}`;

    const complexityShiftText =
      typeof currentComplexity === 'number'
        ? `复杂度变化 ${(selected.projectedComplexity - currentComplexity) > 0 ? '+' : ''}${(
            selected.projectedComplexity - currentComplexity
          ).toFixed(1)}`
        : `预估复杂度 ${selected.projectedComplexity.toFixed(1)}`;

    return `${selected.description}${routeShiftText}，${complexityShiftText}。`;
  });

  function toggleSimulation(presetId: string): void {
    if (selectedSimulationId.value === presetId) {
      selectedSimulationId.value = null;
      return;
    }
    selectedSimulationId.value = presetId;
  }

  return {
    confidenceBadge,
    contributionCards,
    evidenceDigest,
    simulationPresets: SIMULATION_PRESETS,
    selectedSimulationId,
    simulationInsight,
    toggleSimulation,
  };
}
