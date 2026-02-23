import { ParallelAgentInvoker } from '../ParallelAgentInvoker';
import { AgentBase } from '../../../agents/AgentBase';
import { AgentOpinion, PatientProfile } from '@copilot-care/shared/types';

class MockAgent extends AgentBase {
  private shouldFail: boolean;

  constructor(id: string, name: string, shouldFail = false) {
    super(id, name, 'Generalist');
    this.shouldFail = shouldFail;
  }

  async think(profile: PatientProfile, context: string): Promise<AgentOpinion> {
    if (this.shouldFail) {
      throw new Error('Mock agent failure');
    }
    return {
      agentId: this.id,
      agentName: this.name,
      role: this.role,
      riskLevel: 'L1',
      confidence: 0.9,
      reasoning: `Mock thinking for ${this.name}: ${context}`,
      citations: ['test'],
      actions: ['test action'],
    };
  }
}

describe('ParallelAgentInvoker', () => {
  let invoker: ParallelAgentInvoker;
  let mockAgent1: MockAgent;
  let mockAgent2: MockAgent;
  const testProfile: PatientProfile = {
    patientId: 'test-001',
    age: 45,
    sex: 'male',
    chronicDiseases: ['Hypertension'],
    medicationHistory: ['Aspirin'],
  };

  beforeEach(() => {
    invoker = new ParallelAgentInvoker({ timeoutMs: 5000, fallbackOnFailure: true });
    mockAgent1 = new MockAgent('agent-1', 'Test Agent 1');
    mockAgent2 = new MockAgent('agent-2', 'Test Agent 2');
    invoker.registerAgent(mockAgent1);
    invoker.registerAgent(mockAgent2);
  });

  describe('invokeParallel', () => {
    it('should invoke all registered agents in parallel', async () => {
      const results = await invoker.invokeParallel(testProfile, 'test context');

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should return results in correct order', async () => {
      const results = await invoker.invokeParallel(testProfile, 'test context');

      expect(results[0].agentId).toBe('agent-1');
      expect(results[1].agentId).toBe('agent-2');
    });
  });

  describe('invokeParallel', () => {
    it('should invoke all registered agents in parallel', async () => {
      const results = await invoker.invokeParallel(testProfile, 'test context');

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should return results in correct order', async () => {
      const results = await invoker.invokeParallel(testProfile, 'test context');

      expect(results[0].agentId).toBe('agent-1');
      expect(results[1].agentId).toBe('agent-2');
    });
  });

  describe('getAgentStatus', () => {
    it('should return correct status for registered agents', () => {
      const status = invoker.getAgentStatus();

      expect(status['agent-1']).toEqual({ registered: true, hasClient: false });
      expect(status['agent-2']).toEqual({ registered: true, hasClient: false });
    });
  });
});
