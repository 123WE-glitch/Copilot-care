import { DebateTaskDispatcher } from '../DebateTaskDispatcher';
import { AgentBase } from '../../../agents/AgentBase';
import { AgentOpinion, PatientProfile } from '@copilot-care/shared/types';

class MockAgent extends AgentBase {
  constructor(id: string, name: string, role: AgentOpinion['role']) {
    super(id, name, role);
  }

  async think(profile: PatientProfile, context: string): Promise<AgentOpinion> {
    return {
      agentId: this.id,
      agentName: this.name,
      role: this.role,
      riskLevel: 'L1',
      confidence: 0.9,
      reasoning: 'test',
      citations: [],
      actions: [],
    };
  }
}

describe('DebateTaskDispatcher', () => {
  let dispatcher: DebateTaskDispatcher;
  let cardioAgent: MockAgent;
  let gpAgent: MockAgent;
  let metabolicAgent: MockAgent;
  let safetyAgent: MockAgent;

  const cardioProfile: PatientProfile = {
    patientId: 'test-001',
    age: 55,
    sex: 'male',
    chiefComplaint: '胸闷气促',
    chronicDiseases: ['Hypertension', 'HeartDisease'],
    medicationHistory: ['Aspirin'],
  };

  const metabolicProfile: PatientProfile = {
    patientId: 'test-002',
    age: 45,
    sex: 'female',
    chiefComplaint: '血糖升高',
    chronicDiseases: ['Diabetes'],
    medicationHistory: ['Metformin'],
  };

  beforeEach(() => {
    dispatcher = new DebateTaskDispatcher();
    cardioAgent = new MockAgent('cardio-1', '心内Agent', 'Specialist');
    gpAgent = new MockAgent('gp-1', '全科Agent', 'Generalist');
    metabolicAgent = new MockAgent('metabolic-1', '代谢Agent', 'Metabolic');
    safetyAgent = new MockAgent('safety-1', '安全Agent', 'Safety');
    
    dispatcher.registerAgent(cardioAgent);
    dispatcher.registerAgent(gpAgent);
    dispatcher.registerAgent(metabolicAgent);
    dispatcher.registerAgent(safetyAgent);
  });

  describe('analyzeRequiredAgents', () => {
    it('should prioritize safety agent for all cases', () => {
      const assignments = dispatcher.analyzeRequiredAgents(cardioProfile, '一般感冒');

      expect(assignments.length).toBeGreaterThan(0);
      expect(assignments[0].role).toBe('Safety');
    });

    it('should include cardio for cardiovascular symptoms', () => {
      const assignments = dispatcher.analyzeRequiredAgents(cardioProfile, '胸闷气促');

      const cardioAssignment = assignments.find(a => a.role === 'Specialist');
      expect(cardioAssignment).toBeDefined();
      expect(cardioAssignment?.assignedProvider).toBe('deepseek');
    });

    it('should include metabolic for metabolic symptoms', () => {
      const assignments = dispatcher.analyzeRequiredAgents(metabolicProfile, '血糖升高');

      const metabolicAssignment = assignments.find(a => a.role === 'Metabolic');
      expect(metabolicAssignment).toBeDefined();
      expect(metabolicAssignment?.assignedProvider).toBe('gemini');
    });

    it('should include GP agent as fallback', () => {
      const simpleProfile: PatientProfile = {
        patientId: 'test-003',
        age: 30,
        sex: 'male',
        chronicDiseases: [],
        medicationHistory: [],
      };

      const assignments = dispatcher.analyzeRequiredAgents(simpleProfile, '头痛');

      const gpAssignment = assignments.find(a => a.role === 'Generalist');
      expect(gpAssignment).toBeDefined();
    });
  });

  describe('getTaskDistributionSummary', () => {
    it('should calculate correct distribution', () => {
      const assignments = dispatcher.analyzeRequiredAgents(cardioProfile, '胸闷');
      const summary = dispatcher.getTaskDistributionSummary(assignments);

      expect(summary.totalTasks).toBe(assignments.length);
      expect(summary.estimatedTotalTime).toBeGreaterThan(0);
      expect(summary.providerDistribution).toBeDefined();
    });
  });

  describe('getAllAgents', () => {
    it('should return all registered agents', () => {
      const agents = dispatcher.getAllAgents();

      expect(agents).toHaveLength(4);
    });
  });
});
