<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

type Theme = 'default' | 'medical-bay';

const currentTheme = ref<Theme>('medical-bay');
const isTransitioning = ref(false);

function setTheme(theme: Theme) {
  if (theme === currentTheme.value || isTransitioning.value) return;
  
  isTransitioning.value = true;
  currentTheme.value = theme;
  
  // 添加过渡效果
  document.body.classList.add('theme-transitioning');
  
  if (theme === 'medical-bay') {
    document.body.classList.add('medical-bay-theme');
    document.body.classList.remove('default-theme');
    localStorage.setItem('app-theme', 'medical-bay');
  } else {
    document.body.classList.remove('medical-bay-theme');
    document.body.classList.add('default-theme');
    localStorage.setItem('app-theme', 'default');
  }
  
  // 触发全局事件
  window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
  
  setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
    isTransitioning.value = false;
  }, 500);
}

function toggleTheme() {
  setTheme(currentTheme.value === 'default' ? 'medical-bay' : 'default');
}

// 初始化主题
onMounted(() => {
  const savedTheme = localStorage.getItem('app-theme') as Theme | null;
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    // 默认使用医疗舱主题
    setTheme('medical-bay');
  }
});

// 暴露方法给父组件
defineExpose({
  setTheme,
  toggleTheme,
});
</script>

<template>
  <div class="theme-switcher">
    <button
      class="theme-btn"
      :class="{ active: currentTheme === 'default' }"
      @click="setTheme('default')"
      :disabled="isTransitioning"
      title="标准主题"
    >
      <span class="theme-icon">☀️</span>
      <span class="theme-label">标准</span>
    </button>
    
    <div class="theme-divider"></div>
    
    <button
      class="theme-btn"
      :class="{ active: currentTheme === 'medical-bay' }"
      @click="setTheme('medical-bay')"
      :disabled="isTransitioning"
      title="星际医疗舱主题"
    >
      <span class="theme-icon glow">🌌</span>
      <span class="theme-label">医疗舱</span>
    </button>
    
    <div v-if="isTransitioning" class="transition-indicator">
      <span class="spinner"></span>
    </div>
  </div>
</template>

<style scoped>
.theme-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 24px;
  border: 1px solid rgba(100, 200, 255, 0.2);
  position: relative;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 20px;
  background: transparent;
  color: #8b92a8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.theme-btn:hover:not(:disabled) {
  color: #c0c8d8;
  background: rgba(255, 255, 255, 0.05);
}

.theme-btn.active {
  background: linear-gradient(135deg, rgba(100, 200, 255, 0.2) 0%, rgba(100, 200, 255, 0.05) 100%);
  color: #64c8ff;
  box-shadow: 0 0 15px rgba(100, 200, 255, 0.3);
}

.theme-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.theme-icon {
  font-size: 14px;
  filter: grayscale(100%);
  transition: all 0.3s ease;
}

.theme-btn.active .theme-icon {
  filter: grayscale(0%);
}

.theme-icon.glow {
  text-shadow: 0 0 10px rgba(100, 200, 255, 0.8);
}

.theme-label {
  font-weight: 500;
}

.theme-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
}

.transition-indicator {
  position: absolute;
  right: -30px;
  top: 50%;
  transform: translateY(-50%);
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(100, 200, 255, 0.2);
  border-top-color: #64c8ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .theme-label {
    display: none;
  }
  
  .theme-btn {
    padding: 6px;
  }
}
</style>
