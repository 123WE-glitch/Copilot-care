import { computed, type Ref } from 'vue';

interface RoutingInfo {
  routeMode?: string;
  department?: string;
  collaborationMode?: string;
  complexityScore?: number;
  reasons?: string[];
}

interface UseComplexityRoutingBreakdownOptions {
  routing: Readonly<Ref<RoutingInfo | undefined>>;
  hasRedFlag: Readonly<Ref<boolean>>;
  routeModeLabels: Record<string, string>;
}

export interface ComplexityFactorBreakdownItem {
  id: 'symptom' | 'hemodynamic' | 'history' | 'uncertainty';
  label: string;
  score: number;
  weightPercent: number;
  detail: string;
}

export interface ComplexityThresholdCorridorItem {
  mode: string;
  label: string;
  min: number;
  max: number;
  widthPercent: number;
  active: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeComplexityScore(score: number | undefined): number | undefined {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return undefined;
  }
  return clamp(score, 0, 10);
}

function expectedRouteModeByScore(score: number): string {
  if (score < 3) {
    return 'FAST_CONSENSUS';
  }
  if (score < 6) {
    return 'LIGHT_DEBATE';
  }
  if (score < 8) {
    return 'DEEP_DEBATE';
  }
  return 'ESCALATE_TO_OFFLINE';
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

function buildFactorWeights(
  routeMode: string | undefined,
  department: string | undefined,
  hasRedFlag: boolean,
): Record<ComplexityFactorBreakdownItem['id'], number> {
  const weights = {
    symptom: 0.34,
    hemodynamic: 0.29,
    history: 0.22,
    uncertainty: 0.15,
  };

  if (routeMode === 'FAST_CONSENSUS') {
    weights.uncertainty += 0.05;
    weights.hemodynamic -= 0.03;
    weights.history -= 0.02;
  }

  if (department === 'multiDisciplinary') {
    weights.history += 0.04;
    weights.uncertainty += 0.02;
    weights.symptom -= 0.03;
    weights.hemodynamic -= 0.03;
  }

  if (hasRedFlag || routeMode === 'ESCALATE_TO_OFFLINE') {
    weights.hemodynamic += 0.15;
    weights.uncertainty -= 0.05;
    weights.symptom -= 0.05;
    weights.history -= 0.05;
  }

  const total = weights.symptom + weights.hemodynamic + weights.history + weights.uncertainty;
  return {
    symptom: weights.symptom / total,
    hemodynamic: weights.hemodynamic / total,
    history: weights.history / total,
    uncertainty: weights.uncertainty / total,
  };
}

function buildThresholdCorridor(
  score: number | undefined,
  routeMode: string | undefined,
  labels: Record<string, string>,
): ComplexityThresholdCorridorItem[] {
  const corridors = [
    { mode: 'FAST_CONSENSUS', min: 0, max: 3 },
    { mode: 'LIGHT_DEBATE', min: 3, max: 6 },
    { mode: 'DEEP_DEBATE', min: 6, max: 8 },
    { mode: 'ESCALATE_TO_OFFLINE', min: 8, max: 10 },
  ];

  return corridors.map((corridor) => {
    const activeByScore = typeof score === 'number'
      ? score >= corridor.min && score < corridor.max
      : false;
    return {
      ...corridor,
      label: formatRouteMode(corridor.mode, labels),
      widthPercent: ((corridor.max - corridor.min) / 10) * 100,
      active: activeByScore || routeMode === corridor.mode,
    };
  });
}

function buildBoundaryDistanceText(
  score: number | undefined,
  routeMode: string | undefined,
  expectedRouteMode: string | undefined,
  hasRedFlag: boolean,
  labels: Record<string, string>,
): string {
  if (typeof score !== 'number') {
    return '等待复杂度评分完成后显示边界距离。';
  }

  if (hasRedFlag) {
    return '红旗症状触发，已越过复杂度阈值走廊，建议优先线下上转。';
  }

  if (routeMode && expectedRouteMode && routeMode !== expectedRouteMode) {
    return `当前路由为 ${formatRouteMode(routeMode, labels)}，与复杂度建议 ${formatRouteMode(expectedRouteMode, labels)} 不一致。`;
  }

  if (score < 3) {
    return `距下一档（${formatRouteMode('LIGHT_DEBATE', labels)}）还差 ${(
      3 - score
    ).toFixed(1)} 分。`;
  }
  if (score < 6) {
    const toLow = score - 3;
    const toHigh = 6 - score;
    if (toHigh <= toLow) {
      return `距升级到 ${formatRouteMode('DEEP_DEBATE', labels)} 还差 ${toHigh.toFixed(1)} 分。`;
    }
    return `距降级到 ${formatRouteMode('FAST_CONSENSUS', labels)} 还差 ${toLow.toFixed(1)} 分。`;
  }
  if (score < 8) {
    const toLow = score - 6;
    const toHigh = 8 - score;
    if (toHigh <= toLow) {
      return `距升级到 ${formatRouteMode('ESCALATE_TO_OFFLINE', labels)} 还差 ${toHigh.toFixed(1)} 分。`;
    }
    return `距降级到 ${formatRouteMode('LIGHT_DEBATE', labels)} 还差 ${toLow.toFixed(1)} 分。`;
  }
  return `当前复杂度高于 ${formatRouteMode('DEEP_DEBATE', labels)} 上限 ${(score - 8).toFixed(1)} 分。`;
}

export function useComplexityRoutingBreakdown(
  options: UseComplexityRoutingBreakdownOptions,
) {
  const complexityScore = computed<number | undefined>(() => {
    return normalizeComplexityScore(options.routing.value?.complexityScore);
  });

  const routeMode = computed<string | undefined>(() => {
    return options.routing.value?.routeMode;
  });

  const expectedRouteMode = computed<string | undefined>(() => {
    if (typeof complexityScore.value !== 'number') {
      return undefined;
    }
    return expectedRouteModeByScore(complexityScore.value);
  });

  const expectedRouteLabel = computed<string>(() => {
    return formatRouteMode(expectedRouteMode.value, options.routeModeLabels);
  });

  const routeAlignmentText = computed<string>(() => {
    if (typeof complexityScore.value !== 'number') {
      return '复杂度尚未完成评分。';
    }

    if (options.hasRedFlag.value) {
      return '红旗优先：路由优先按安全边界处理。';
    }

    if (!routeMode.value || !expectedRouteMode.value) {
      return '等待路由结果。';
    }

    if (routeMode.value === expectedRouteMode.value) {
      return `当前路由与阈值建议一致：${expectedRouteLabel.value}`;
    }

    return `当前路由与复杂度建议存在偏移，建议复核边界。`;
  });

  const corridorPointerPercent = computed<number | null>(() => {
    if (typeof complexityScore.value !== 'number') {
      return null;
    }
    return clamp((complexityScore.value / 10) * 100, 0, 100);
  });

  const thresholdCorridor = computed<ComplexityThresholdCorridorItem[]>(() => {
    return buildThresholdCorridor(
      complexityScore.value,
      routeMode.value,
      options.routeModeLabels,
    );
  });

  const factorBreakdown = computed<ComplexityFactorBreakdownItem[]>(() => {
    const score = complexityScore.value;
    if (typeof score !== 'number') {
      return [
        {
          id: 'symptom',
          label: '症状负担',
          score: 0,
          weightPercent: 34,
          detail: '等待症状结构化分析。',
        },
        {
          id: 'hemodynamic',
          label: '生命体征风险',
          score: 0,
          weightPercent: 29,
          detail: '等待生命体征输入。',
        },
        {
          id: 'history',
          label: '慢病/用药复杂度',
          score: 0,
          weightPercent: 22,
          detail: '等待病史聚合。',
        },
        {
          id: 'uncertainty',
          label: '决策不确定性',
          score: 0,
          weightPercent: 15,
          detail: '等待协同推理结果。',
        },
      ];
    }

    const weights = buildFactorWeights(
      routeMode.value,
      options.routing.value?.department,
      options.hasRedFlag.value,
    );
    const reasons = options.routing.value?.reasons ?? [];

    return [
      {
        id: 'symptom',
        label: '症状负担',
        score: round1(score * weights.symptom),
        weightPercent: Math.round(weights.symptom * 100),
        detail: reasons[0] ?? '由主诉和症状数量驱动。',
      },
      {
        id: 'hemodynamic',
        label: '生命体征风险',
        score: round1(score * weights.hemodynamic),
        weightPercent: Math.round(weights.hemodynamic * 100),
        detail: options.hasRedFlag.value
          ? '红旗症状已提高该因子权重。'
          : '由血压/体征风险评估驱动。',
      },
      {
        id: 'history',
        label: '慢病/用药复杂度',
        score: round1(score * weights.history),
        weightPercent: Math.round(weights.history * 100),
        detail:
          options.routing.value?.department === 'multiDisciplinary'
            ? '多学科场景下慢病复杂度权重提升。'
            : '由慢病史和用药史驱动。',
      },
      {
        id: 'uncertainty',
        label: '决策不确定性',
        score: round1(score * weights.uncertainty),
        weightPercent: Math.round(weights.uncertainty * 100),
        detail:
          routeMode.value === 'FAST_CONSENSUS'
            ? '快速共识模式下降低不确定性权重。'
            : '由协同分歧与信息缺口驱动。',
      },
    ];
  });

  const boundaryDistanceText = computed<string>(() => {
    return buildBoundaryDistanceText(
      complexityScore.value,
      routeMode.value,
      expectedRouteMode.value,
      options.hasRedFlag.value,
      options.routeModeLabels,
    );
  });

  const topReasons = computed<string[]>(() => {
    return (options.routing.value?.reasons ?? []).slice(0, 4);
  });

  return {
    complexityScore,
    factorBreakdown,
    thresholdCorridor,
    corridorPointerPercent,
    boundaryDistanceText,
    routeAlignmentText,
    expectedRouteLabel,
    topReasons,
  };
}
