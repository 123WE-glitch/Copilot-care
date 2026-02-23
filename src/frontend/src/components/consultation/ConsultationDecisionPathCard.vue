<script setup lang="ts">
interface ConsultationDecisionPathCardProps {
  statusText: string;
  routingActive: boolean;
  collaborationActive: boolean;
  pathDepartmentText: string;
  pathRouteModeText: string;
  pathCollaborationText: string;
}

defineProps<ConsultationDecisionPathCardProps>();
</script>

<template>
  <div class="panel-card">
    <div class="panel-head-row">
      <h3>分诊决策路径</h3>
      <span class="status-chip">{{ statusText }}</span>
    </div>
    <div class="path-grid">
      <article class="path-node" :class="{ active: routingActive }">
        <small>步骤 1</small>
        <strong>首轮分诊</strong>
        <p>{{ pathDepartmentText }}</p>
      </article>
      <article class="path-node" :class="{ active: routingActive }">
        <small>步骤 2</small>
        <strong>复杂度分流</strong>
        <p>{{ pathRouteModeText }}</p>
      </article>
      <article class="path-node" :class="{ active: collaborationActive }">
        <small>步骤 3</small>
        <strong>协同模式</strong>
        <p>{{ pathCollaborationText }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.panel-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 6px 18px rgba(17, 44, 72, 0.06);
}

.panel-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.status-chip {
  font-size: 12px;
  color: #0f5e65;
  background: #e8f7f7;
  border: 1px solid #a8d8dc;
  border-radius: 999px;
  padding: 2px 10px;
}

.path-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.path-node {
  border: 1px solid #d1dcea;
  border-radius: 10px;
  padding: 10px;
  background: #f8fbff;
  transition: all 180ms ease;
}

.path-node small {
  display: block;
  color: #62809d;
  font-size: 11px;
}

.path-node strong {
  display: block;
  margin-top: 2px;
  font-size: 14px;
}

.path-node p {
  margin: 6px 0 0;
  color: #3e5d77;
  font-size: 12px;
  line-height: 1.4;
}

.path-node.active {
  border-color: #0e8d8f;
  background: #eaf6f6;
  box-shadow: 0 8px 16px rgba(14, 141, 143, 0.12);
}

@media (max-width: 1100px) {
  .path-grid {
    grid-template-columns: 1fr;
  }
}
</style>
