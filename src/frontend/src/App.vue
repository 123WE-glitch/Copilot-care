<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { navItems } from './router';

const THEME_STORAGE_KEY = 'copilot-care.theme';

const router = useRouter();
const route = useRoute();
const mobileMenuOpen = ref(false);
const isDarkTheme = ref(false);

const activeNav = computed(() =>
  navItems.find((item) => {
    if (item.path === '/') {
      return route.path === '/';
    }
    return route.path.startsWith(item.path);
  }),
);

const routeDescription = computed(
  () => activeNav.value?.description ?? '临床决策支持工作台，强调可解释与可追踪。',
);

const themeLabel = computed(() => (isDarkTheme.value ? '深色' : '浅色'));
const currentYear = new Date().getFullYear();

function applyTheme(mode: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', mode);
}

function navigate(path: string): void {
  void router.push(path);
  mobileMenuOpen.value = false;
}

function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
}

function toggleTheme(): void {
  isDarkTheme.value = !isDarkTheme.value;
}

onMounted(() => {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  const initialMode = saved === 'light' || saved === 'dark' ? saved : preferred;

  isDarkTheme.value = initialMode === 'dark';
  applyTheme(initialMode);
});

watch(isDarkTheme, (value) => {
  const mode = value ? 'dark' : 'light';
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyTheme(mode);
});
</script>

<template>
  <div class="app-shell">
    <div class="aurora aurora-a" />
    <div class="aurora aurora-b" />

    <header class="app-header">
      <div class="brand-block">
        <div class="brand-mark">CC</div>
        <div class="brand-copy">
          <strong>CoPilot Care</strong>
          <span>临床 AI 分诊平台</span>
        </div>
      </div>

      <p class="route-summary">{{ routeDescription }}</p>

      <nav class="header-nav" aria-label="主导航">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="navigate(item.path)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <div class="header-actions">
        <button
          class="theme-toggle"
          :title="`切换到${isDarkTheme ? '浅色' : '深色'}模式`"
          @click="toggleTheme"
        >
          {{ themeLabel }}
        </button>

        <button
          class="mobile-menu-btn"
          :aria-expanded="mobileMenuOpen"
          aria-label="切换菜单"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          菜单
        </button>
      </div>
    </header>

    <Transition name="menu-slide">
      <nav v-if="mobileMenuOpen" class="mobile-nav" aria-label="移动端导航">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="mobile-nav-item"
          :class="{ active: isActive(item.path) }"
          @click="navigate(item.path)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>
    </Transition>

    <main class="app-main">
      <RouterView />
    </main>

    <footer class="app-footer">
      <span>CoPilot Care v1.0.0</span>
      <span class="divider" />
      <span>医疗决策支持平台</span>
      <span class="divider" />
      <span>{{ currentYear }}</span>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--color-text-primary);
}

.aurora {
  position: fixed;
  pointer-events: none;
  z-index: -1;
  filter: blur(70px);
  opacity: 0.65;
}

.aurora-a {
  width: 360px;
  height: 360px;
  top: -100px;
  left: -80px;
  background: radial-gradient(circle, rgba(32, 146, 132, 0.35), transparent 70%);
}

.aurora-b {
  width: 460px;
  height: 460px;
  top: 180px;
  right: -140px;
  background: radial-gradient(circle, rgba(231, 165, 72, 0.28), transparent 70%);
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 90;
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  min-height: 68px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-primary) 82%, transparent);
  backdrop-filter: blur(12px);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #ffffff;
  background: linear-gradient(135deg, #126d73 0%, #1f9c8f 52%, #d7a846 100%);
  box-shadow: 0 10px 20px rgba(16, 68, 90, 0.28);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-copy strong {
  font-size: 15px;
  letter-spacing: 0.02em;
}

.brand-copy span {
  font-size: 11px;
  color: var(--color-text-muted);
}

.route-summary {
  margin: 0;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-bg-primary) 70%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-item {
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 999px;
  padding: 7px 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  transition: all 160ms ease;
}

.nav-item:hover {
  border-color: var(--color-border);
  background: color-mix(in srgb, var(--color-bg-primary) 80%, transparent);
  color: var(--color-text-primary);
}

.nav-item.active {
  color: #ffffff;
  border-color: transparent;
  background: linear-gradient(130deg, #1d8d88 0%, #186979 55%, #0f4f62 100%);
  box-shadow: 0 8px 20px rgba(21, 94, 106, 0.25);
}

.nav-icon {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.nav-label {
  font-size: 13px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle,
.mobile-menu-btn {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-bg-primary) 80%, transparent);
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  cursor: pointer;
  transition: all 160ms ease;
}

.theme-toggle:hover,
.mobile-menu-btn:hover {
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
  transform: translateY(-1px);
}

.mobile-menu-btn {
  display: none;
}

.mobile-nav {
  display: none;
  margin: 8px 16px 0;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-bg-primary) 90%, transparent);
}

.mobile-nav-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  background: transparent;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.mobile-nav-item:last-child {
  border-bottom: none;
}

.mobile-nav-item.active {
  color: #ffffff;
  background: linear-gradient(130deg, #1d8d88 0%, #186979 55%, #0f4f62 100%);
}

.app-main {
  flex: 1;
  min-height: 0;
}

.app-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 12px;
  background: color-mix(in srgb, var(--color-bg-primary) 86%, transparent);
}

.divider {
  width: 1px;
  height: 12px;
  background: var(--color-border);
}

.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: all 180ms ease;
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 1080px) {
  .app-header {
    grid-template-columns: auto minmax(120px, 1fr) auto;
  }

  .header-nav {
    display: none;
  }

  .mobile-menu-btn {
    display: inline-flex;
  }

  .mobile-nav {
    display: block;
  }
}

@media (max-width: 760px) {
  .app-header {
    grid-template-columns: auto auto;
    gap: 10px;
    padding: 10px 14px;
  }

  .route-summary {
    grid-column: 1 / -1;
    order: 10;
  }

  .app-footer {
    flex-wrap: wrap;
    gap: 6px;
  }

  .divider {
    display: none;
  }
}
</style>
