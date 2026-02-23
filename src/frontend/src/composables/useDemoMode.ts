import { computed, ref, watch } from 'vue';

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  stage?: string;
  reasoning?: string;
  highlight?: string[];
}

const STAGE_ORDER = [
  'INFO_GATHER',
  'RISK_ASSESS',
  'ROUTING',
  'DEBATE',
  'CONSENSUS',
  'REVIEW',
  'OUTPUT',
];

const STAGE_TITLES: Record<string, string> = {
  INFO_GATHER: '信息采集',
  RISK_ASSESS: '风险评估',
  ROUTING: '复杂度分流',
  DEBATE: '协同讨论',
  CONSENSUS: '共识收敛',
  REVIEW: '审校复核',
  OUTPUT: '输出结论',
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  INFO_GATHER: '收集患者主诉、关键生命体征和既往病史。',
  RISK_ASSESS: '识别红旗症状并评估风险分层。',
  ROUTING: '根据复杂度评分选择协同深度和路由策略。',
  DEBATE: '多角色Agent并行分析并交换证据。',
  CONSENSUS: '收敛分歧并形成可解释决策。',
  REVIEW: '执行安全审校，阻断不安全输出。',
  OUTPUT: '生成结构化会诊结论与行动建议。',
};

const STAGE_DEFAULT_REASONING: Record<string, string> = {
  INFO_GATHER: '症状解析与结构化映射完成，输入质量满足分诊要求。',
  RISK_ASSESS: '红旗规则与风险阈值已完成联合判定。',
  ROUTING: '复杂度评分与阈值走廊匹配，路由策略可解释。',
  DEBATE: '专科与安全角色开始证据交叉验证。',
  CONSENSUS: '分歧指标下降，共识意见趋于稳定。',
  REVIEW: '安全审校确认输出边界和上转条件。',
  OUTPUT: '结论、证据、行动建议已整理为可导出报告。',
};

const STAGE_HIGHLIGHTS: Record<string, string[]> = {
  INFO_GATHER: ['症状抽取', '结构化输入'],
  RISK_ASSESS: ['红旗检查', '风险分层'],
  ROUTING: ['复杂度拆解', '阈值走廊'],
  DEBATE: ['多角色协同', '证据对齐'],
  CONSENSUS: ['分歧收敛', '结论稳定'],
  REVIEW: ['安全阻断', '风险边界'],
  OUTPUT: ['报告生成', '导出复核'],
};

export function useDemoMode() {
  const isDemoMode = ref(false);
  const currentStepIndex = ref(0);
  const isPaused = ref(false);
  const speed = ref(1);
  const autoPlay = ref(false);
  const steps = ref<DemoStep[]>([]);

  let autoPlayTimer: ReturnType<typeof setInterval> | null = null;

  const currentStep = computed(() => steps.value[currentStepIndex.value] || null);
  const totalSteps = computed(() => steps.value.length);
  const progress = computed(() => {
    if (totalSteps.value === 0) return 0;
    return ((currentStepIndex.value + 1) / totalSteps.value) * 100;
  });
  const hasNext = computed(() => currentStepIndex.value < totalSteps.value - 1);
  const hasPrev = computed(() => currentStepIndex.value > 0);

  function initSteps(newSteps: DemoStep[]): void {
    steps.value = [...newSteps];
    currentStepIndex.value = 0;
    isPaused.value = false;
  }

  function clearSteps(): void {
    stopAutoPlay();
    steps.value = [];
    currentStepIndex.value = 0;
    isDemoMode.value = false;
  }

  function startDemo(): void {
    if (steps.value.length === 0) return;
    isDemoMode.value = true;
    currentStepIndex.value = 0;
    isPaused.value = false;
    if (autoPlay.value) {
      startAutoPlay();
    }
  }

  function pauseDemo(): void {
    isPaused.value = true;
    stopAutoPlay();
  }

  function resumeDemo(): void {
    isPaused.value = false;
    if (autoPlay.value) {
      startAutoPlay();
    }
  }

  function togglePause(): void {
    if (isPaused.value) {
      resumeDemo();
    } else {
      pauseDemo();
    }
  }

  function resetDemo(): void {
    stopAutoPlay();
    currentStepIndex.value = 0;
    isPaused.value = false;
  }

  function nextStep(): void {
    if (hasNext.value) {
      currentStepIndex.value += 1;
      return;
    }
    stopAutoPlay();
  }

  function prevStep(): void {
    if (hasPrev.value) {
      currentStepIndex.value -= 1;
    }
  }

  function goToStep(index: number): void {
    if (index >= 0 && index < totalSteps.value) {
      currentStepIndex.value = index;
    }
  }

  function setSpeed(newSpeed: number): void {
    speed.value = newSpeed;
    if (autoPlay.value) {
      stopAutoPlay();
      startAutoPlay();
    }
  }

  function toggleAutoPlay(): void {
    autoPlay.value = !autoPlay.value;
    if (autoPlay.value) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }
  }

  function startAutoPlay(): void {
    stopAutoPlay();
    const interval = 3000 / speed.value;
    autoPlayTimer = setInterval(() => {
      if (isPaused.value) {
        return;
      }
      if (hasNext.value) {
        nextStep();
      } else {
        stopAutoPlay();
      }
    }, interval);
  }

  function stopAutoPlay(): void {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  function exitDemo(): void {
    stopAutoPlay();
    isDemoMode.value = false;
    currentStepIndex.value = 0;
  }

  watch(
    () => isDemoMode.value,
    (value) => {
      if (!value) {
        stopAutoPlay();
      }
    },
  );

  return {
    isDemoMode,
    currentStepIndex,
    currentStep,
    isPaused,
    speed,
    autoPlay,
    steps,
    totalSteps,
    progress,
    hasNext,
    hasPrev,
    initSteps,
    clearSteps,
    startDemo,
    pauseDemo,
    resumeDemo,
    togglePause,
    resetDemo,
    nextStep,
    prevStep,
    goToStep,
    setSpeed,
    toggleAutoPlay,
    exitDemo,
  };
}

export function createDemoStepsFromReasoning(
  reasoningItems: Array<{ kind: string; text: string; stage?: string }>,
  stageRuntime: Record<string, { status: string; message: string }>,
): DemoStep[] {
  const demoSteps: DemoStep[] = [
    {
      id: 'step-start',
      title: '启动会诊',
      description: '系统接收输入并初始化流程状态机。',
      stage: 'START',
      reasoning: '输入校验通过，开始执行会诊编排。',
      highlight: ['输入校验', '流程初始化'],
    },
  ];

  for (const stage of STAGE_ORDER) {
    const runtime = stageRuntime[stage];
    if (!runtime || runtime.status === 'pending') {
      continue;
    }

    const reasoningText = reasoningItems
      .filter((item) => item.stage === stage)
      .slice(0, 2)
      .map((item) => item.text)
      .join('；');

    demoSteps.push({
      id: `step-${stage.toLowerCase()}`,
      title: STAGE_TITLES[stage] ?? stage,
      description: runtime.message || STAGE_DESCRIPTIONS[stage] || '',
      stage,
      reasoning: reasoningText || STAGE_DEFAULT_REASONING[stage] || '',
      highlight: STAGE_HIGHLIGHTS[stage] ?? [],
    });
  }

  return demoSteps;
}

export function createCompetitionDemoScript(): DemoStep[] {
  return [
    {
      id: 'comp-1',
      title: '场景引入',
      description: '展示患者输入与结构化信息采集入口。',
      stage: 'START',
      reasoning: '强调输入质量控制和可追溯日志。',
      highlight: ['结构化输入', '质控'],
    },
    {
      id: 'comp-2',
      title: '决策推理驾驶舱',
      description: '展示置信度、贡献因子和关键证据摘要。',
      stage: 'ROUTING',
      reasoning: '演示决策透明度如何支持临床解释。',
      highlight: ['贡献分解', '置信度'],
    },
    {
      id: 'comp-3',
      title: '复杂度阈值走廊',
      description: '展示复杂度因子拆解与路由边界距离。',
      stage: 'ROUTING',
      reasoning: '说明为何进入轻度/深度辩论或线下上转。',
      highlight: ['阈值走廊', '边界距离'],
    },
    {
      id: 'comp-4',
      title: '多泳道执行看板',
      description: '展示各阶段状态、耗时和重试次数。',
      stage: 'DEBATE',
      reasoning: '突出执行过程可观测性和异常处理能力。',
      highlight: ['阶段耗时', '重试追踪'],
    },
    {
      id: 'comp-5',
      title: '安全审校阻断',
      description: '演示红旗触发后的安全边界与上转分支。',
      stage: 'REVIEW',
      reasoning: '强调安全优先，不输出不可靠建议。',
      highlight: ['红旗触发', '阻断策略'],
    },
    {
      id: 'comp-6',
      title: '报告导出与复核',
      description: '展示中文报告导出和会诊证据回溯。',
      stage: 'OUTPUT',
      reasoning: '将会诊过程沉淀为可复核交付物。',
      highlight: ['中文导出', '证据回溯'],
    },
  ];
}
