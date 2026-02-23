import { AgentOpinion, PatientProfile } from '@copilot-care/shared/types';
import { ClinicalLLMClient } from '../../llm/types';
import { AgentBase } from '../../agents/AgentBase';

export interface ParallelAgentResult {
  agentId: string;
  agentName: string;
  opinion: AgentOpinion;
  success: boolean;
  error?: string;
  durationMs: number;
}

export interface ParallelAgentConfig {
  timeoutMs: number;
  fallbackOnFailure: boolean;
}

const DEFAULT_CONFIG: ParallelAgentConfig = {
  timeoutMs: 30000,
  fallbackOnFailure: true,
};

export class ParallelAgentInvoker {
  private agents: Map<string, AgentBase> = new Map();
  private clients: Map<string, ClinicalLLMClient> = new Map();
  private config: ParallelAgentConfig;

  constructor(config: Partial<ParallelAgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public registerAgent(agent: AgentBase, client?: ClinicalLLMClient): void {
    this.agents.set(agent.getId(), agent);
    if (client) {
      this.clients.set(agent.getId(), client);
    }
  }

  public async invokeParallel(
    profile: PatientProfile,
    context: string,
    agentIds?: string[],
  ): Promise<ParallelAgentResult[]> {
    const targetAgents = agentIds
      ? agentIds.filter(id => this.agents.has(id)).map(id => this.agents.get(id)!)
      : Array.from(this.agents.values());

    const promises = targetAgents.map(agent => 
      this.invokeSingleAgent(agent, profile, context)
    );

    const results = await Promise.all(promises);
    return results;
  }

  public async invokeWithFallback(
    profile: PatientProfile,
    context: string,
    agentIds?: string[],
  ): Promise<ParallelAgentResult[]> {
    const results = await this.invokeParallel(profile, context, agentIds);
    
    if (this.config.fallbackOnFailure) {
      const failedResults = results.filter(r => !r.success);
      
      for (const failed of failedResults) {
        const agent = this.agents.get(failed.agentId);
        if (agent) {
          const fallback = await agent.think(profile, context);
          failed.opinion = fallback;
          failed.success = true;
          failed.error = undefined;
        }
      }
    }
    
    return results;
  }

  private async invokeSingleAgent(
    agent: AgentBase,
    profile: PatientProfile,
    context: string,
  ): Promise<ParallelAgentResult> {
    const startTime = Date.now();
    
    try {
      const client = this.clients.get(agent.getId());
      
      if (!client) {
        const opinion = await agent.think(profile, context);
        return {
          agentId: agent.getId(),
          agentName: agent.getName(),
          opinion,
          success: true,
          durationMs: Date.now() - startTime,
        };
      }

      const opinion = await Promise.race([
        agent.think(profile, context),
        this.createTimeout(this.config.timeoutMs),
      ]) as AgentOpinion;

      return {
        agentId: agent.getId(),
        agentName: agent.getName(),
        opinion,
        success: true,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      try {
        const fallback = await agent.think(profile, context);
        return {
          agentId: agent.getId(),
          agentName: agent.getName(),
          opinion: fallback,
          success: this.config.fallbackOnFailure,
          error: errorMessage,
          durationMs: Date.now() - startTime,
        };
      } catch (fallbackError) {
        return {
          agentId: agent.getId(),
          agentName: agent.getName(),
          opinion: {
            agentId: agent.getId(),
            agentName: agent.getName(),
            role: 'Generalist',
            riskLevel: 'L2',
            confidence: 0,
            reasoning: `Agent执行失败: ${errorMessage}`,
            citations: [],
            actions: ['建议线下就医'],
          },
          success: false,
          error: errorMessage,
          durationMs: Date.now() - startTime,
        };
      }
    }
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Agent调用超时: ${ms}ms`)), ms);
    });
  }

  public getAgentStatus(): Record<string, { registered: boolean; hasClient: boolean }> {
    const status: Record<string, { registered: boolean; hasClient: boolean }> = {};
    
    for (const [id, agent] of this.agents) {
      status[id] = {
        registered: true,
        hasClient: this.clients.has(id),
      };
    }
    
    return status;
  }
}
