import { AgentBase } from '../../agents/AgentBase';
import { PatientProfile, AgentOpinion, OrchestrationSnapshot, DebateResult } from '@copilot-care/shared/types';
import { DebateEngine, DebateRuntimeHooks } from '../../core/DebateEngine';
import { DebateTaskDispatcher, DebateTaskAssignment } from './DebateTaskDispatcher';
import { ParallelAgentInvoker } from './ParallelAgentInvoker';
import { ClinicalLLMClient } from '../../llm/types';

export interface EnhancedDebateConfig {
  enableParallelExecution: boolean;
  enableDynamicTaskAssignment: boolean;
  agentTimeoutMs: number;
  fallbackOnFailure: boolean;
}

const DEFAULT_CONFIG: EnhancedDebateConfig = {
  enableParallelExecution: true,
  enableDynamicTaskAssignment: true,
  agentTimeoutMs: 30000,
  fallbackOnFailure: true,
};

export class EnhancedDebateEngine {
  private debateEngine: DebateEngine;
  private taskDispatcher: DebateTaskDispatcher;
  private parallelInvoker: ParallelAgentInvoker;
  private config: EnhancedDebateConfig;

  constructor(
    agents: AgentBase[],
    llmClients: Map<string, ClinicalLLMClient>,
    config: Partial<EnhancedDebateConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.debateEngine = new DebateEngine(agents, { maxRounds: 3 });
    this.taskDispatcher = new DebateTaskDispatcher();
    this.parallelInvoker = new ParallelAgentInvoker({
      timeoutMs: this.config.agentTimeoutMs,
      fallbackOnFailure: this.config.fallbackOnFailure,
    });

    for (const agent of agents) {
      const client = llmClients.get(agent.getId()) || null;
      this.parallelInvoker.registerAgent(agent, client || undefined);
      this.taskDispatcher.registerAgent(agent);
    }
  }

  public analyzeTasks(profile: PatientProfile, symptomText?: string): DebateTaskAssignment[] {
    return this.taskDispatcher.analyzeRequiredAgents(profile, symptomText);
  }

  public async runWithDynamicAssignment(
    profile: PatientProfile,
    sessionId: string,
    symptomText?: string,
    hooks?: DebateRuntimeHooks,
  ): Promise<{
    result: DebateResult;
    taskAssignments: DebateTaskAssignment[];
    distribution: ReturnType<DebateTaskDispatcher['getTaskDistributionSummary']>;
  }> {
    const taskAssignments = this.analyzeTasks(profile, symptomText);
    const distribution = this.taskDispatcher.getTaskDistributionSummary(taskAssignments);

    if (this.config.enableParallelExecution && taskAssignments.length > 1) {
      const agentIds = taskAssignments.map(t => t.agentId);
      const parallelResults = await this.parallelInvoker.invokeWithFallback(
        profile,
        `分析任务分配：${taskAssignments.length}个Agent待执行`,
        agentIds,
      );

      hooks?.onRoundCompleted?.({
        roundNumber: 0,
        opinions: parallelResults.map(r => r.opinion),
        dissentIndex: 0,
        dissentBand: 'CONSENSUS',
      });
    }

    const result = await this.debateEngine.runSession(profile, sessionId, hooks);
    return { result, taskAssignments, distribution };
  }

  public getDispatcher(): DebateTaskDispatcher {
    return this.taskDispatcher;
  }

  public getInvoker(): ParallelAgentInvoker {
    return this.parallelInvoker;
  }

  public getConfig(): EnhancedDebateConfig {
    return { ...this.config };
  }
}

export function createEnhancedDebateEngine(
  agents: AgentBase[],
  llmClients: Map<string, ClinicalLLMClient>,
  config?: Partial<EnhancedDebateConfig>,
): EnhancedDebateEngine {
  return new EnhancedDebateEngine(agents, llmClients, config);
}
