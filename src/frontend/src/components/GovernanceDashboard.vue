<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useGovernanceDashboard } from '../composables/useGovernanceDashboard';
import {
  GOVERNANCE_COLOR_BY_STATUS,
  METRIC_STATUS_LABELS,
  MILESTONE_STATUS_LABELS,
  RISK_SEVERITY_LABELS,
  type RiskTrigger,
} from '../features/governance/model';

const {
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
} = useGovernanceDashboard();

const completedMilestones = computed<number>(
  () => milestones.value.filter((item) => item.status === 'done').length,
);

const progressSummary = computed<string>(() => {
  const totalMilestones = milestones.value.length;
  if (totalMilestones === 0) {
    return '当前无里程碑数据。';
  }

  return `按里程碑任务项完成度加权计算（${completedMilestones.value}/${totalMilestones} 已完成）。`;
});

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleString('zh-CN');
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function metricDeviationClass(value: number): string {
  if (value <= 0) {
    return 'ok';
  }
  if (value <= 0.1) {
    return 'warn';
  }
  return 'bad';
}

function hasActionableRisk(trigger: RiskTrigger): boolean {
  return !trigger.acknowledged;
}

onMounted(() => {
  refresh();
});
</script>

<template>
  <section class="dashboard-root">
    <header class="dashboard-header">
      <div>
        <p class="eyebrow">治理指标</p>
        <h2>里程碑与门禁健康度</h2>
      </div>
      <div class="header-actions">
        <span class="last-updated">更新时间：{{ formatTime(lastUpdated) }}</span>
        <button class="refresh-btn" :disabled="loading" @click="refresh">
          {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </header>

    <section v-if="loading" class="loading-state">
      <div class="spinner" />
      <p>正在加载治理快照...</p>
    </section>

    <template v-else>
      <section class="overview-grid">
        <article class="progress-card">
          <div class="ring-wrap">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" class="ring-base" />
              <circle
                cx="50"
                cy="50"
                r="44"
                class="ring-fill"
                :stroke-dasharray="`${overallProgress * 2.764} 276.4`"
              />
            </svg>
            <div class="ring-value">{{ overallProgress }}%</div>
          </div>
          <div class="progress-copy">
            <h3>总体完成度</h3>
            <p>{{ progressSummary }}</p>
          </div>
        </article>

        <article class="kpi-card">
          <span class="kpi-value">{{ completedMilestones }}</span>
          <span class="kpi-label">已完成里程碑</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-value">{{ breachedMetrics.length + atRiskMetrics.length }}</span>
          <span class="kpi-label">风险指标数</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-value">{{ unacknowledgedTriggers.length }}</span>
          <span class="kpi-label">待确认触发器</span>
        </article>
      </section>

      <section class="panel">
        <h3>里程碑进度</h3>
        <div class="milestone-grid">
          <article v-for="milestone in milestones" :key="milestone.id" class="milestone-item">
            <header>
              <strong>{{ milestone.id }}</strong>
              <span :style="{ color: GOVERNANCE_COLOR_BY_STATUS[milestone.status] }">
                {{ MILESTONE_STATUS_LABELS[milestone.status] }}
              </span>
            </header>
            <p>{{ milestone.title }}</p>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{
                  width: `${(milestone.completed / milestone.total) * 100}%`,
                  backgroundColor: GOVERNANCE_COLOR_BY_STATUS[milestone.status],
                }"
              />
            </div>
            <small>{{ milestone.completed }}/{{ milestone.total }}</small>
          </article>
        </div>
      </section>

      <section class="panel">
        <h3>指标偏差台账</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>里程碑</th>
                <th>指标项</th>
                <th>目标</th>
                <th>实际</th>
                <th>偏差</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="metric in metrics" :key="`${metric.milestoneId}-${metric.metricName}`">
                <td>{{ metric.milestoneId }}</td>
                <td>{{ metric.metricName }}</td>
                <td>{{ formatPercent(metric.targetValue) }}</td>
                <td>{{ formatPercent(metric.actualValue) }}</td>
                <td :class="metricDeviationClass(metric.deviation)">
                  {{ metric.deviation > 0 ? '+' : '' }}{{ formatPercent(metric.deviation) }}
                </td>
                <td>
                  <span
                    class="status-badge"
                    :style="{ backgroundColor: GOVERNANCE_COLOR_BY_STATUS[metric.status] }"
                  >
                    {{ METRIC_STATUS_LABELS[metric.status] }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h3>风险触发器</h3>
        <div class="trigger-list">
          <article v-for="trigger in riskTriggers" :key="trigger.id" class="trigger-item">
            <div class="trigger-head">
              <span
                class="status-badge"
                :style="{ backgroundColor: GOVERNANCE_COLOR_BY_STATUS[trigger.severity] }"
              >
                {{ RISK_SEVERITY_LABELS[trigger.severity] }}
              </span>
              <small>{{ trigger.type }}</small>
              <small>{{ formatTime(trigger.timestamp) }}</small>
            </div>
            <p>{{ trigger.message }}</p>
            <button
              v-if="hasActionableRisk(trigger)"
              class="ack-btn"
              @click="acknowledgeTrigger(trigger.id)"
            >
              标记已确认
            </button>
            <small v-else class="ack-text">已确认</small>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.dashboard-root {
  display: grid;
  gap: 14px;
  color: var(--color-text-primary);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: end;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.dashboard-header h2 {
  margin: 4px 0 0;
  font-size: 24px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.last-updated {
  font-size: 12px;
  color: var(--color-text-muted);
}

.refresh-btn {
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-primary) 88%, transparent);
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.loading-state {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-bg-primary) 88%, transparent);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 900ms linear infinite;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) repeat(3, minmax(140px, 1fr));
  gap: 10px;
}

.progress-card,
.kpi-card,
.panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-bg-primary) 92%, transparent);
  box-shadow: var(--shadow-sm);
}

.progress-card {
  padding: 14px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
}

.ring-wrap {
  position: relative;
  width: 92px;
  height: 92px;
}

.ring-wrap svg {
  width: 100%;
  height: 100%;
}

.ring-base {
  fill: none;
  stroke: color-mix(in srgb, var(--color-border) 80%, transparent);
  stroke-width: 8;
}

.ring-fill {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 8;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
}

.ring-value {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 700;
}

.progress-copy h3 {
  margin: 0 0 6px;
  font-size: 16px;
}

.progress-copy p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.kpi-card {
  padding: 14px;
  display: grid;
  gap: 6px;
  align-content: center;
}

.kpi-value {
  font-size: 30px;
  line-height: 1;
  font-weight: 700;
}

.kpi-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.panel {
  padding: 14px;
}

.panel h3 {
  margin: 0 0 10px;
  font-size: 16px;
}

.milestone-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.milestone-item {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 10px;
  background: color-mix(in srgb, var(--color-bg-tertiary) 88%, transparent);
}

.milestone-item header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.milestone-item p {
  margin: 8px 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.bar-track {
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
}

.milestone-item small {
  display: block;
  margin-top: 7px;
  color: var(--color-text-muted);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border-light);
  font-size: 12px;
}

th {
  color: var(--color-text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

td.ok {
  color: var(--color-success);
}

td.warn {
  color: var(--color-warning);
}

td.bad {
  color: var(--color-danger);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
}

.trigger-list {
  display: grid;
  gap: 8px;
}

.trigger-item {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 10px;
  background: color-mix(in srgb, var(--color-bg-tertiary) 88%, transparent);
}

.trigger-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trigger-head small {
  font-size: 11px;
  color: var(--color-text-muted);
}

.trigger-head small:last-child {
  margin-left: auto;
}

.trigger-item p {
  margin: 8px 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.ack-btn {
  border: 1px solid color-mix(in srgb, var(--color-primary) 38%, var(--color-border));
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary-dark);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
}

.ack-text {
  color: var(--color-text-muted);
  font-size: 11px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1080px) {
  .overview-grid {
    grid-template-columns: 1fr 1fr;
  }

  .progress-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 680px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .progress-card {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
}
</style>
