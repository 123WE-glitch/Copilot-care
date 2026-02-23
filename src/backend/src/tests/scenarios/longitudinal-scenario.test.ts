import {
  getAllLongitudinalWeeks,
  LONGITUDINAL_SCENARIOS,
} from './fixtures/longitudinal-scenarios';

describe('Longitudinal Follow-up Scenarios', () => {
  describe('Scenario Structure', () => {
    it('should have at least 3 longitudinal scenarios', () => {
      expect(LONGITUDINAL_SCENARIOS.length).toBeGreaterThanOrEqual(3);
    });

    it('each scenario should have at least 2 weeks of data', () => {
      for (const scenario of LONGITUDINAL_SCENARIOS) {
        expect(scenario.weeks.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('each week should have required fields', () => {
      const allWeeks = getAllLongitudinalWeeks();
      expect(allWeeks.length).toBeGreaterThan(0);

      for (const week of allWeeks) {
        expect(week.scenarioId).toBeDefined();
        expect(week.patientId).toBeDefined();
        expect(week.weekNumber).toBeGreaterThan(0);
        expect(week.request).toBeDefined();
        expect(week.expected).toBeDefined();
        expect(week.expected.status).toBeDefined();
        expect(week.expected.expectedProgression).toBeDefined();
      }
    });
  });

  describe('Progression Logic', () => {
    it('improving progression should have negative or zero week-over-week changes', () => {
      const improvingWeeks = getAllLongitudinalWeeks().filter(
        w => w.expected.expectedProgression === 'improving' && w.expected.weekOverWeekChange
      );

      for (const week of improvingWeeks) {
        const change = week.expected.weekOverWeekChange;
        if (change) {
          if (change.systolicBP !== undefined) {
            expect(change.systolicBP).toBeLessThanOrEqual(0);
          }
          if (change.diastolicBP !== undefined) {
            expect(change.diastolicBP).toBeLessThanOrEqual(0);
          }
        }
      }
    });

    it('worsening progression should have positive week-over-week changes', () => {
      const worseningWeeks = getAllLongitudinalWeeks().filter(
        w => w.expected.expectedProgression === 'worsening' && w.expected.weekOverWeekChange
      );

      for (const week of worseningWeeks) {
        const change = week.expected.weekOverWeekChange;
        if (change) {
          const hasPositiveChange = 
            (change.systolicBP !== undefined && change.systolicBP > 0) ||
            (change.diastolicBP !== undefined && change.diastolicBP > 0) ||
            (change.heartRate !== undefined && change.heartRate > 0);
          expect(hasPositiveChange).toBe(true);
        }
      }
    });

    it('escalation scenarios should have ESCALATE_TO_OFFLINE status', () => {
      const escalationWeeks = getAllLongitudinalWeeks().filter(
        w => w.expected.status === 'ESCALATE_TO_OFFLINE'
      );

      expect(escalationWeeks.length).toBeGreaterThan(0);

      for (const week of escalationWeeks) {
        expect(week.expected.expectedProgression).toBe('worsening');
      }
    });
  });

  describe('Patient Continuity', () => {
    it('each scenario should have consistent patientId across weeks', () => {
      for (const scenario of LONGITUDINAL_SCENARIOS) {
        const patientIds = new Set(
          scenario.weeks.map(w => w.request.profile.patientId)
        );
        expect(patientIds.size).toBe(1);
        expect(patientIds.values().next().value).toBe(scenario.patientId);
      }
    });

    it('each scenario should have unique session IDs per week', () => {
      for (const scenario of LONGITUDINAL_SCENARIOS) {
        const sessionIds = scenario.weeks.map(w => w.request.sessionId);
        const uniqueIds = new Set(sessionIds);
        expect(uniqueIds.size).toBe(sessionIds.length);
      }
    });
  });
});
