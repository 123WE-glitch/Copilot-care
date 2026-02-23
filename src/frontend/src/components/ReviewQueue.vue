<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  REVIEW_STATUS_LABELS,
  type ReviewItem as GovernanceReviewItem,
} from '../features/governance/model';

export type ReviewItem = GovernanceReviewItem;

const props = defineProps<{
  items: ReviewItem[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', item: ReviewItem): void;
  (e: 'approve', item: ReviewItem): void;
  (e: 'reject', item: ReviewItem): void;
}>();

const selectedId = ref<string>('');

const pendingItems = computed(() =>
  props.items.filter((item) => item.status === 'pending'),
);

const reviewingItems = computed(() =>
  props.items.filter((item) => item.status === 'reviewing'),
);

const completedItems = computed(() =>
  props.items.filter(
    (item) => item.status === 'approved' || item.status === 'rejected',
  ),
);

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function selectItem(item: ReviewItem): void {
  selectedId.value = item.id;
  emit('select', item);
}

function approveItem(item: ReviewItem): void {
  emit('approve', item);
}

function rejectItem(item: ReviewItem): void {
  emit('reject', item);
}
</script>

<template>
  <div class="queue-root">
    <header class="queue-header">
      <h3>复核队列</h3>
      <span class="queue-pill">待处理 {{ pendingItems.length }} 条</span>
    </header>

    <div v-if="loading" class="queue-state">正在加载复核队列...</div>
    <div v-else-if="items.length === 0" class="queue-state">当前没有待复核病例。</div>

    <div v-else class="queue-groups">
      <section v-if="pendingItems.length > 0" class="queue-group">
        <h4>待复核</h4>
        <article
          v-for="item in pendingItems"
          :key="item.id"
          class="queue-item"
          :class="{ selected: selectedId === item.id }"
          @click="selectItem(item)"
        >
          <div class="item-head">
            <strong>{{ item.patientId }}</strong>
            <small>{{ formatTime(item.createdAt) }}</small>
          </div>
          <span class="triage-chip">{{ item.triageLevel }}</span>
          <p>{{ item.summary }}</p>
          <div class="item-actions">
            <button class="approve" @click.stop="approveItem(item)">通过</button>
            <button class="reject" @click.stop="rejectItem(item)">驳回</button>
          </div>
        </article>
      </section>

      <section v-if="reviewingItems.length > 0" class="queue-group">
        <h4>复核中</h4>
        <article
          v-for="item in reviewingItems"
          :key="item.id"
          class="queue-item"
          :class="{ selected: selectedId === item.id }"
          @click="selectItem(item)"
        >
          <div class="item-head">
            <strong>{{ item.patientId }}</strong>
            <small>{{ REVIEW_STATUS_LABELS[item.status] }}</small>
          </div>
          <span class="triage-chip">{{ item.triageLevel }}</span>
          <p>{{ item.summary }}</p>
        </article>
      </section>

      <section v-if="completedItems.length > 0" class="queue-group">
        <h4>已完成（{{ completedItems.length }}）</h4>
        <article
          v-for="item in completedItems"
          :key="item.id"
          class="queue-item completed"
          :class="{ selected: selectedId === item.id }"
          @click="selectItem(item)"
        >
          <div class="item-head">
            <strong>{{ item.patientId }}</strong>
            <small>{{ REVIEW_STATUS_LABELS[item.status] }}</small>
          </div>
          <span class="triage-chip">{{ item.triageLevel }}</span>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped>
.queue-root {
  height: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
  background: color-mix(in srgb, var(--color-bg-primary) 90%, transparent);
  box-shadow: var(--shadow-sm);
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.queue-header h3 {
  margin: 0;
  font-size: 16px;
}

.queue-pill {
  font-size: 11px;
  color: #ffffff;
  background: var(--color-primary);
  border-radius: 999px;
  padding: 3px 8px;
}

.queue-state {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 34px 0;
}

.queue-groups {
  display: grid;
  gap: 12px;
  max-height: 560px;
  overflow: auto;
  padding-right: 2px;
}

.queue-group {
  display: grid;
  gap: 8px;
}

.queue-group h4 {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.queue-item {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 10px;
  background: color-mix(in srgb, var(--color-bg-tertiary) 88%, transparent);
  cursor: pointer;
  transition: all 140ms ease;
}

.queue-item:hover {
  border-color: var(--color-border);
  transform: translateY(-1px);
}

.queue-item.selected {
  border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
  box-shadow: 0 8px 16px rgba(24, 88, 108, 0.14);
}

.queue-item.completed {
  opacity: 0.78;
}

.item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.item-head strong {
  font-size: 13px;
}

.item-head small {
  color: var(--color-text-muted);
  font-size: 11px;
}

.triage-chip {
  display: inline-block;
  margin-top: 7px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--color-primary-dark);
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.queue-item p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--color-text-secondary);
}

.item-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 10px;
}

.item-actions button {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.item-actions button.approve {
  color: var(--color-success);
  border-color: color-mix(in srgb, var(--color-success) 36%, var(--color-border));
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
}

.item-actions button.reject {
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger) 36%, var(--color-border));
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
}

@media (max-width: 680px) {
  .queue-root {
    padding: 12px;
  }
}
</style>
