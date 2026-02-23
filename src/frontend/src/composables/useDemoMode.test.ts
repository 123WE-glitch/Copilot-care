import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCompetitionDemoScript,
  createDemoStepsFromReasoning,
  useDemoMode,
} from './useDemoMode';

describe('useDemoMode helpers', () => {
  it('creates competition demo script with explainability focus', () => {
    const script = createCompetitionDemoScript();

    expect(script.length).toBeGreaterThanOrEqual(6);
    expect(script.some((step) => step.stage === 'ROUTING')).toBe(true);
    expect(script.some((step) => step.title.includes('驾驶舱'))).toBe(true);
  });

  it('builds replay steps from runtime and reasoning events', () => {
    const steps = createDemoStepsFromReasoning(
      [
        { kind: 'system', stage: 'ROUTING', text: '复杂度评分为 6.1' },
        { kind: 'decision', stage: 'ROUTING', text: '进入深度辩论' },
        { kind: 'warning', stage: 'REVIEW', text: '触发安全审校' },
      ],
      {
        START: { status: 'done', message: '已启动' },
        INFO_GATHER: { status: 'done', message: '已采集' },
        RISK_ASSESS: { status: 'done', message: '已评估' },
        ROUTING: { status: 'done', message: '分流完成' },
        DEBATE: { status: 'running', message: '讨论中' },
        CONSENSUS: { status: 'pending', message: '等待' },
        REVIEW: { status: 'pending', message: '等待' },
        OUTPUT: { status: 'pending', message: '等待' },
      },
    );

    expect(steps[0].title).toBe('启动会诊');
    expect(steps.some((step) => step.title === '复杂度分流')).toBe(true);
    expect(steps.find((step) => step.stage === 'ROUTING')?.reasoning).toContain('复杂度评分');
  });
});

describe('useDemoMode state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('starts demo and navigates between steps', () => {
    const demo = useDemoMode();
    demo.initSteps([
      { id: '1', title: '步骤1', description: 'd1' },
      { id: '2', title: '步骤2', description: 'd2' },
    ]);

    demo.startDemo();
    expect(demo.isDemoMode.value).toBe(true);
    expect(demo.currentStepIndex.value).toBe(0);

    demo.nextStep();
    expect(demo.currentStepIndex.value).toBe(1);
    demo.prevStep();
    expect(demo.currentStepIndex.value).toBe(0);
  });

  it('auto-plays steps with configured speed', async () => {
    const demo = useDemoMode();
    demo.initSteps([
      { id: '1', title: '步骤1', description: 'd1' },
      { id: '2', title: '步骤2', description: 'd2' },
      { id: '3', title: '步骤3', description: 'd3' },
    ]);
    demo.setSpeed(2);
    demo.toggleAutoPlay();
    demo.startDemo();

    await vi.advanceTimersByTimeAsync(1600);

    expect(demo.currentStepIndex.value).toBeGreaterThan(0);
  });
});
