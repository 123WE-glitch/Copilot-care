import { AgentOpinion, PatientProfile } from '@copilot-care/shared/types';

export abstract class AgentBase {
  public id: string;
  public name: string;
  protected readonly role: AgentOpinion['role'];

  constructor(id: string, name: string, role: AgentOpinion['role']) {
    this.id = id;
    this.name = name;
    this.role = role;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getRole(): AgentOpinion['role'] {
    return this.role;
  }

  abstract think(profile: PatientProfile, context: string): Promise<AgentOpinion>;
}
