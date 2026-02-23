import { describe, it, expect, vi } from 'vitest';
import { useThinkChainState } from './useThinkChainState';
import type { OrchestrationSnapshot } from '@copilot-care/shared/types';

describe('useThinkChainState', () => {
  const mockSnapshot: OrchestrationSnapshot = {
    coordinator: '总Agent',
    phase: 'execution',
    summary: '测试总结',
    tasks: [
      {
        taskId: 'task_overall',
        roleId: 'chief_coordinator',
        roleName: '总Agent',
        objective: '协调任务',
        status: 'running',
        progress: 50,
        latestUpdate: '正在执行',
      },
      {
        taskId: 'task_cardio',
        roleId: 'cardio_agent',
        roleName: '心内Agent',
        objective: '心血管评估',
        status: 'done',
        progress: 100,
        provider: 'deepseek',
        subTasks: [],
      },
      {
        taskId: 'task_safety',
        roleId: 'safety_agent',
        roleName: '安全Agent',
        objective: '安全检查',
        status: 'running',
        progress: 60,
        provider: 'kimi',
        subTasks: [],
      },
    ],
    graph: {
      nodes: [],
      edges: [],
    },
    generatedAt: new Date().toISOString(),
    source: 'rule',
  };

  it('should initialize with empty state', () => {
    const { currentSnapshot, thinkSteps, isRunning } = useThinkChainState();
    
    expect(currentSnapshot.value).toBeNull();
    expect(thinkSteps.value).toEqual([]);
    expect(isRunning.value).toBe(false);
  });

  it('should update snapshot correctly', () => {
    const { updateSnapshot, currentSnapshot, thinkSteps } = useThinkChainState();
    
    updateSnapshot(mockSnapshot);
    
    expect(currentSnapshot.value).not.toBeNull();
    expect(currentSnapshot.value?.phase).toBe('execution');
    expect(thinkSteps.value.length).toBeGreaterThan(0);
  });

  it('should calculate task counts correctly', () => {
    const { updateSnapshot, taskCount, completedTaskCount } = useThinkChainState();
    
    updateSnapshot(mockSnapshot);
    
    expect(taskCount.value).toBe(3);
    expect(completedTaskCount.value).toBe(1);
  });

  it('should set running state', () => {
    const { setRunning, isRunning } = useThinkChainState();
    
    setRunning(true);
    expect(isRunning.value).toBe(true);
    
    setRunning(false);
    expect(isRunning.value).toBe(false);
  });

  it('should reset state', () => {
    const { updateSnapshot, setRunning, reset, currentSnapshot, thinkSteps, isRunning } = useThinkChainState();
    
    updateSnapshot(mockSnapshot);
    setRunning(true);
    
    reset();
    
    expect(currentSnapshot.value).toBeNull();
    expect(thinkSteps.value).toEqual([]);
    expect(isRunning.value).toBe(false);
  });

  it('should call onSnapshotUpdate callback', () => {
    const callback = vi.fn();
    const { updateSnapshot } = useThinkChainState({ onSnapshotUpdate: callback });
    
    updateSnapshot(mockSnapshot);
    
    expect(callback).toHaveBeenCalledWith(mockSnapshot);
  });
});
