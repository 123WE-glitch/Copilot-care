<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  EVIDENCE_TYPE_LABELS,
  GOVERNANCE_COLOR_BY_STATUS,
  type EvidenceItem as GovernanceEvidenceItem,
} from '../features/governance/model';

export type EvidenceItem = GovernanceEvidenceItem;

const props = defineProps<{
  visible: boolean;
  evidences: EvidenceItem[];
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', item: EvidenceItem): void;
}>();

const selectedEvidence = ref<EvidenceItem | null>(null);

const groupedEvidences = computed(() => {
  const grouped: Record<string, EvidenceItem[]> = {};
  for (const item of props.evidences) {
    if (!grouped[item.type]) {
      grouped[item.type] = [];
    }
    grouped[item.type].push(item);
  }
  return grouped;
});

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      return;
    }
    if (props.evidences.length > 0 && !selectedEvidence.value) {
      selectedEvidence.value = props.evidences[0];
    }
  },
);

watch(
  () => props.evidences,
  (next) => {
    if (next.length === 0) {
      selectedEvidence.value = null;
      return;
    }
    if (
      !selectedEvidence.value ||
      !next.find((item) => item.id === selectedEvidence.value?.id)
    ) {
      selectedEvidence.value = next[0];
    }
  },
);

function formatTime(value?: string): string {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleString('zh-CN');
}

function confidenceTone(confidence?: number): string {
  if (confidence === undefined) {
    return 'var(--color-text-muted)';
  }
  if (confidence >= 0.8) {
    return GOVERNANCE_COLOR_BY_STATUS.completed;
  }
  if (confidence >= 0.6) {
    return GOVERNANCE_COLOR_BY_STATUS.at_risk;
  }
  return GOVERNANCE_COLOR_BY_STATUS.breached;
}

function selectEvidence(item: EvidenceItem): void {
  selectedEvidence.value = item;
  emit('select', item);
}

function closeDrawer(): void {
  emit('close');
}
</script>

<template>
  <Transition name="drawer-fade">
    <div v-if="visible" class="drawer-overlay" @click.self="closeDrawer">
      <aside class="drawer-panel">
        <header class="drawer-header">
          <h3>{{ title || '证据包详情' }}</h3>
          <button class="close-btn" @click="closeDrawer">关闭</button>
        </header>

        <section v-if="evidences.length === 0" class="drawer-empty">
          当前复核条目暂无可展示证据。
        </section>

        <section v-else class="drawer-content">
          <nav class="group-nav">
            <span v-for="(items, type) in groupedEvidences" :key="type" class="group-pill">
              {{ EVIDENCE_TYPE_LABELS[type as EvidenceItem['type']] }}
              <small>{{ items.length }}</small>
            </span>
          </nav>

          <div class="evidence-list">
            <article
              v-for="item in evidences"
              :key="item.id"
              class="evidence-item"
              :class="{ selected: selectedEvidence?.id === item.id }"
              @click="selectEvidence(item)"
            >
              <div class="item-head">
                <span class="type-pill">{{ EVIDENCE_TYPE_LABELS[item.type] }}</span>
                <small
                  v-if="item.confidence !== undefined"
                  :style="{ color: confidenceTone(item.confidence) }"
                >
                  {{ (item.confidence * 100).toFixed(0) }}%
                </small>
              </div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
              <footer>
                <small>{{ item.source || '未标注来源' }}</small>
                <small>{{ formatTime(item.timestamp) }}</small>
              </footer>
            </article>
          </div>

          <article v-if="selectedEvidence" class="evidence-detail">
            <h4>证据明细</h4>
            <dl>
              <dt>标题</dt>
              <dd>{{ selectedEvidence.title }}</dd>

              <dt>说明</dt>
              <dd>{{ selectedEvidence.description }}</dd>

              <dt v-if="selectedEvidence.source">来源</dt>
              <dd v-if="selectedEvidence.source">{{ selectedEvidence.source }}</dd>

              <dt v-if="selectedEvidence.confidence !== undefined">置信度</dt>
              <dd
                v-if="selectedEvidence.confidence !== undefined"
                :style="{ color: confidenceTone(selectedEvidence.confidence) }"
              >
                {{ (selectedEvidence.confidence * 100).toFixed(1) }}%
              </dd>
            </dl>
          </article>
        </section>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(10, 20, 30, 0.5);
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: min(460px, 92vw);
  height: 100%;
  border-left: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-primary) 92%, transparent);
  display: flex;
  flex-direction: column;
  box-shadow: -20px 0 40px rgba(0, 0, 0, 0.24);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-bottom: 1px solid var(--color-border);
}

.drawer-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
}

.drawer-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
}

.drawer-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.group-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.group-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-tertiary) 88%, transparent);
  font-size: 11px;
  color: var(--color-text-secondary);
  padding: 4px 8px;
}

.group-pill small {
  color: var(--color-text-muted);
}

.evidence-list {
  display: grid;
  gap: 8px;
}

.evidence-item {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 10px;
  background: color-mix(in srgb, var(--color-bg-tertiary) 88%, transparent);
  cursor: pointer;
  transition: all 140ms ease;
}

.evidence-item:hover {
  border-color: var(--color-border);
}

.evidence-item.selected {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  box-shadow: 0 8px 16px rgba(19, 71, 96, 0.14);
}

.item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.type-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 10px;
  color: var(--color-primary-dark);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.evidence-item strong {
  display: block;
  margin-top: 7px;
  font-size: 13px;
}

.evidence-item p {
  margin: 8px 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--color-text-secondary);
}

.evidence-item footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.evidence-item footer small {
  font-size: 11px;
  color: var(--color-text-muted);
}

.evidence-detail {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 12px;
  background: color-mix(in srgb, var(--color-bg-primary) 92%, transparent);
}

.evidence-detail h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.evidence-detail dl {
  margin: 0;
  display: grid;
  gap: 6px;
}

.evidence-detail dt {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.evidence-detail dd {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 170ms ease;
}

.drawer-fade-enter-active .drawer-panel,
.drawer-fade-leave-active .drawer-panel {
  transition: transform 170ms ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-from .drawer-panel,
.drawer-fade-leave-to .drawer-panel {
  transform: translateX(26px);
}
</style>
