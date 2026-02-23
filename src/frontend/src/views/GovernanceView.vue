<script setup lang="ts">
import { computed, ref } from 'vue';
import GovernanceDashboard from '../components/GovernanceDashboard.vue';
import ReviewQueue from '../components/ReviewQueue.vue';
import EvidenceDrawer from '../components/EvidenceDrawer.vue';
import {
  buildEvidenceBundle,
  createMockReviewQueue,
} from '../features/governance/mock';
import type {
  EvidenceItem,
  ReviewItem,
  ReviewStatus,
} from '../features/governance/model';

type GovernanceTab = 'dashboard' | 'queue';

type QueueUpdateStatus = Extract<ReviewStatus, 'approved' | 'rejected'>;

const activeTab = ref<GovernanceTab>('dashboard');
const showEvidenceDrawer = ref<boolean>(false);
const selectedEvidences = ref<EvidenceItem[]>([]);
const reviewItems = ref<ReviewItem[]>(createMockReviewQueue());

const pendingCount = computed<number>(
  () => reviewItems.value.filter((item) => item.status === 'pending').length,
);

const reviewingCount = computed<number>(
  () => reviewItems.value.filter((item) => item.status === 'reviewing').length,
);

const approvedCount = computed<number>(
  () => reviewItems.value.filter((item) => item.status === 'approved').length,
);

const pageSummary = computed<string>(() => {
  if (activeTab.value === 'dashboard') {
    return '追踪里程碑健康度、阈值漂移与发布门禁状态。';
  }
  return '对分诊输出进行复核与裁决后再进入临床交接。';
});

function updateQueueStatus(itemId: string, status: QueueUpdateStatus): void {
  reviewItems.value = reviewItems.value.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    return {
      ...item,
      status,
    };
  });
}

function handleSelectReview(item: ReviewItem): void {
  selectedEvidences.value = buildEvidenceBundle(item);
  showEvidenceDrawer.value = true;
}

function handleApproveReview(item: ReviewItem): void {
  updateQueueStatus(item.id, 'approved');
}

function handleRejectReview(item: ReviewItem): void {
  updateQueueStatus(item.id, 'rejected');
}
</script>

<template>
  <div class="governance-view">
    <header class="hero">
      <div class="hero-copy">
        <p class="eyebrow">治理运营</p>
        <h1>质量门禁与临床复核</h1>
        <p>{{ pageSummary }}</p>
      </div>

      <div class="hero-stats">
        <article class="stat-card">
          <span class="stat-value">{{ pendingCount }}</span>
          <span class="stat-label">待复核</span>
        </article>
        <article class="stat-card">
          <span class="stat-value">{{ reviewingCount }}</span>
          <span class="stat-label">复核中</span>
        </article>
        <article class="stat-card">
          <span class="stat-value">{{ approvedCount }}</span>
          <span class="stat-label">已通过</span>
        </article>
      </div>
    </header>

    <nav class="tab-nav" aria-label="治理视图切换">
      <button
        :class="{ active: activeTab === 'dashboard' }"
        @click="activeTab = 'dashboard'"
      >
        治理看板
      </button>
      <button :class="{ active: activeTab === 'queue' }" @click="activeTab = 'queue'">
        复核队列
        <span v-if="pendingCount > 0" class="badge">{{ pendingCount }}</span>
      </button>
    </nav>

    <main class="view-content">
      <section v-if="activeTab === 'dashboard'" class="tab-content">
        <GovernanceDashboard />
      </section>

      <section v-else class="tab-content queue-layout">
        <article class="queue-panel">
          <ReviewQueue
            :items="reviewItems"
            @select="handleSelectReview"
            @approve="handleApproveReview"
            @reject="handleRejectReview"
          />
        </article>
        <aside class="queue-note">
          <h3>复核清单</h3>
          <ol>
            <li>确认该病例门禁证据齐全。</li>
            <li>核对推理依据、引用来源和安全状态。</li>
            <li>明确通过/驳回，并给出后续纠正动作。</li>
          </ol>
        </aside>
      </section>
    </main>

    <EvidenceDrawer
      :visible="showEvidenceDrawer"
      :evidences="selectedEvidences"
      title="复核证据包"
      @close="showEvidenceDrawer = false"
    />
  </div>
</template>

<style scoped>
.governance-view {
  min-height: 100%;
  padding: 18px;
  color: var(--color-text-primary);
}

.hero {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  gap: 16px;
  margin-bottom: 16px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 0% 0%, rgba(223, 187, 118, 0.22), transparent 44%),
    radial-gradient(circle at 100% 100%, rgba(46, 134, 149, 0.16), transparent 42%),
    var(--color-bg-primary);
  box-shadow: var(--shadow-md);
}

.hero-copy h1 {
  margin: 2px 0 8px;
  font-size: 30px;
  line-height: 1.08;
}

.hero-copy p {
  margin: 0;
  max-width: 62ch;
  color: var(--color-text-secondary);
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(110px, 1fr));
  gap: 10px;
}

.stat-card {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-primary) 86%, transparent);
}

.stat-value {
  display: block;
  font-size: 30px;
  line-height: 1;
  font-weight: 700;
}

.stat-label {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.tab-nav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 6px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-bg-primary) 86%, transparent);
}

.tab-nav button {
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-secondary);
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 160ms ease;
}

.tab-nav button:hover {
  color: var(--color-text-primary);
  background: color-mix(in srgb, var(--color-bg-tertiary) 84%, transparent);
}

.tab-nav button.active {
  color: #ffffff;
  background: linear-gradient(130deg, #1d8d88 0%, #156777 100%);
  box-shadow: 0 10px 20px rgba(21, 84, 99, 0.24);
}

.badge {
  font-size: 11px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 999px;
  color: #ffffff;
  background: #d05738;
}

.view-content {
  min-height: 440px;
}

.tab-content {
  animation: panel-in 220ms ease;
}

.queue-layout {
  display: grid;
  grid-template-columns: minmax(280px, 520px) minmax(220px, 1fr);
  gap: 16px;
}

.queue-panel {
  min-height: 500px;
}

.queue-note {
  align-self: start;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  background: color-mix(in srgb, var(--color-bg-primary) 88%, transparent);
  box-shadow: var(--shadow-sm);
}

.queue-note h3 {
  margin: 0 0 10px;
  font-size: 16px;
}

.queue-note ol {
  margin: 0;
  padding-left: 16px;
  display: grid;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1080px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    grid-template-columns: repeat(3, minmax(90px, 1fr));
  }

  .queue-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .governance-view {
    padding: 12px;
  }

  .hero {
    padding: 14px;
  }

  .hero-copy h1 {
    font-size: 24px;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .tab-nav {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-radius: 14px;
  }

  .tab-nav button {
    justify-content: center;
  }
}
</style>
