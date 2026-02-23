import { AgentBase } from '../../agents/AgentBase';
import {
  AgentOpinion,
  PatientProfile,
} from '@copilot-care/shared/types';
import { DebateEngine, DebateRuntimeHooks } from '../../core/DebateEngine';

export interface DebateTaskAssignment {
  taskId: string;
  agentId: string;
  agentName: string;
  role: AgentOpinion['role'];
  priority: number;
  estimatedDurationMs: number;
  assignedProvider?: string;
}

export interface DebateRuntimeHooksExtended extends DebateRuntimeHooks {
  onAgentAssigned?: (assignment: DebateTaskAssignment) => void;
  onTaskStatusChange?: (taskId: string, status: string) => void;
}

export class DebateTaskDispatcher {
  private agents: Map<string, AgentBase> = new Map();
  private rolePriority: Map<string, number> = new Map();
  private providerMapping: Map<string, string> = new Map();

  constructor() {
    this.initializeRolePriorities();
  }

  private initializeRolePriorities(): void {
    this.rolePriority.set('Safety', 1);
    this.rolePriority.set('Specialist', 2);
    this.rolePriority.set('Metabolic', 3);
    this.rolePriority.set('Generalist', 4);
    this.rolePriority.set('TCM', 5);

    this.providerMapping.set('cardio', 'deepseek');
    this.providerMapping.set('metabolic', 'gemini');
    this.providerMapping.set('gp', 'gemini');
    this.providerMapping.set('safety', 'kimi');
  }

  public registerAgent(agent: AgentBase): void {
    this.agents.set(agent.getId(), agent);
  }

  public analyzeRequiredAgents(profile: PatientProfile, symptomText?: string): DebateTaskAssignment[] {
    const assignments: DebateTaskAssignment[] = [];
    const chiefComplaint = symptomText || profile.chronicDiseases.join(' ');
    const complaintLower = chiefComplaint.toLowerCase();

    const cardioKeywords = ['胸闷', '胸痛', '心悸', '气促', '血压', '心脏', '心血管', '冠心病'];
    const metabolicKeywords = ['血糖', '血脂', '糖尿病', '代谢', '肥胖', '高血压'];
    const safetyKeywords = ['红旗', '危险', '紧急', '严重'];

    const needsCardio = cardioKeywords.some(k => complaintLower.includes(k)) || 
      profile.chronicDiseases.includes('Hypertension') ||
      profile.chronicDiseases.includes('HeartDisease');

    const needsMetabolic = metabolicKeywords.some(k => complaintLower.includes(k)) ||
      profile.chronicDiseases.includes('Diabetes') ||
      profile.chronicDiseases.includes('Hyperlipidemia');

    const needsSafety = safetyKeywords.some(k => complaintLower.includes(k)) || true;

    let priority = 1;

    if (needsSafety) {
      const safetyAgent = this.findAgentByRole('Safety');
      if (safetyAgent) {
        assignments.push({
          taskId: `task_safety_${Date.now()}`,
          agentId: safetyAgent.getId(),
          agentName: safetyAgent.getName(),
          role: 'Safety',
          priority: priority++,
          estimatedDurationMs: 5000,
          assignedProvider: this.providerMapping.get('safety'),
        });
      }
    }

    if (needsCardio) {
      const cardioAgent = this.findAgentByRole('Specialist');
      if (cardioAgent) {
        assignments.push({
          taskId: `task_cardio_${Date.now()}`,
          agentId: cardioAgent.getId(),
          agentName: cardioAgent.getName(),
          role: 'Specialist',
          priority: priority++,
          estimatedDurationMs: 8000,
          assignedProvider: this.providerMapping.get('cardio'),
        });
      }
    }

    if (needsMetabolic) {
      const metabolicAgent = this.findAgentByRole('Metabolic');
      if (metabolicAgent) {
        assignments.push({
          taskId: `task_metabolic_${Date.now()}`,
          agentId: metabolicAgent.getId(),
          agentName: metabolicAgent.getName(),
          role: 'Metabolic',
          priority: priority++,
          estimatedDurationMs: 6000,
          assignedProvider: this.providerMapping.get('metabolic'),
        });
      }
    }

    const gpAgent = this.findAgentByRole('Generalist');
    if (gpAgent) {
      assignments.push({
        taskId: `task_gp_${Date.now()}`,
        agentId: gpAgent.getId(),
        agentName: gpAgent.getName(),
        role: 'Generalist',
        priority: priority,
        estimatedDurationMs: 5000,
        assignedProvider: this.providerMapping.get('gp'),
      });
    }

    return assignments.sort((a, b) => a.priority - b.priority);
  }

  private findAgentByRole(role: string): AgentBase | undefined {
    for (const agent of this.agents.values()) {
      if (agent.getRole() === role) {
        return agent;
      }
    }
    return undefined;
  }

  public getAgentById(agentId: string): AgentBase | undefined {
    return this.agents.get(agentId);
  }

  public getAllAgents(): AgentBase[] {
    return Array.from(this.agents.values());
  }

  public getTaskDistributionSummary(assignments: DebateTaskAssignment[]): {
    totalTasks: number;
    estimatedTotalTime: number;
    providerDistribution: Record<string, number>;
  } {
    const estimatedTotalTime = Math.max(...assignments.map(a => a.estimatedDurationMs));
    const providerDistribution: Record<string, number> = {};

    for (const assignment of assignments) {
      const provider = assignment.assignedProvider || 'unknown';
      providerDistribution[provider] = (providerDistribution[provider] || 0) + 1;
    }

    return {
      totalTasks: assignments.length,
      estimatedTotalTime,
      providerDistribution,
    };
  }
}

export { DebateEngine };
export type { DebateRuntimeHooks };
