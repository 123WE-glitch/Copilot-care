import { computed, ref } from 'vue';
import { createMockGovernanceSnapshot } from '../features/governance/mock';
import type {
  MetricRecord,
  MilestoneProgress,
  RiskTrigger,
} from '../features/governance/model';

export function useGovernanceDashboard() {
  const metrics = ref<MetricRecord[]>([]);
  const milestones = ref<MilestoneProgress[]>([]);
  const riskTriggers = ref<RiskTrigger[]>([]);
  const loading = ref<boolean>(false);
  const lastUpdated = ref<string>('');

  const overallProgress = computed(() => {
    const total = milestones.value.reduce((sum, item) => sum + item.total, 0);
    const completed = milestones.value.reduce(
      (sum, item) => sum + item.completed,
      0,
    );
    if (total === 0) {
      return 0;
    }
    return Math.round((completed / total) * 100);
  });

  const breachedMetrics = computed(() =>
    metrics.value.filter((metric) => metric.status === 'breached'),
  );

  const atRiskMetrics = computed(() =>
    metrics.value.filter((metric) => metric.status === 'at_risk'),
  );

  const unacknowledgedTriggers = computed(() =>
    riskTriggers.value.filter((trigger) => !trigger.acknowledged),
  );

  async function refresh(): Promise<void> {
    loading.value = true;

    const snapshot = createMockGovernanceSnapshot();
    metrics.value = snapshot.metrics;
    milestones.value = snapshot.milestones;
    riskTriggers.value = snapshot.riskTriggers;
    lastUpdated.value = snapshot.lastUpdated;

    loading.value = false;
  }

  function acknowledgeTrigger(triggerId: string): void {
    const matched = riskTriggers.value.find((item) => item.id === triggerId);
    if (!matched) {
      return;
    }
    matched.acknowledged = true;
  }

  return {
    metrics,
    milestones,
    riskTriggers,
    loading,
    lastUpdated,
    overallProgress,
    breachedMetrics,
    atRiskMetrics,
    unacknowledgedTriggers,
    refresh,
    acknowledgeTrigger,
  };
}
