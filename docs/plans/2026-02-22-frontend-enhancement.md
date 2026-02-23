# 国创赛前端增强功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为国创赛增强前端功能，添加患者健康仪表盘、会诊报告导出、AI推理演示模式等核心功能

**Architecture:** 基于现有Vue 3 + Vite + TypeScript技术栈，使用ECharts进行数据可视化，jsPDF实现PDF导出

**Tech Stack:** Vue 3, TypeScript, ECharts, jsPDF, vue-router, Pinia

---

## 第一阶段：患者健康仪表盘 (PatientDashboard)

### Task 1: 创建患者仪表盘页面路由和基础结构

**Files:**
- Create: `src/frontend/src/views/PatientDashboardView.vue`
- Modify: `src/frontend/src/router/index.ts`

**Step 1: 添加路由 router配置**

在/index.ts 中添加患者仪表盘路由：

```typescript
{
  path: '/patient/:id',
  name: 'patient-dashboard',
  component: () => import('../views/PatientDashboardView.vue'),
  meta: {
    title: '患者档案',
    icon: '👤',
    description: '患者健康数据仪表盘',
  },
},
```

**Step 2: 创建PatientDashboardView基础结构**

创建文件 `src/frontend/src/views/PatientDashboardView.vue`，包含：
- 患者基本信息卡片
- 生命体征趋势图区域
- 会诊历史记录列表
- 导出报告按钮

### Task 2: 实现生命体征趋势图表组件

**Files:**
- Create: `src/frontend/src/components/VitalsTrendChart.vue`
- Modify: `src/frontend/src/views/PatientDashboardView.vue`

**Step 1: 创建VitalsTrendChart组件**

使用ECharts创建折线图，展示：
- 血压（收缩压/舒张压）
- 心率
- 血糖（如有）

**Step 2: 集成到PatientDashboardView**

在患者仪表盘中集成图表组件，调用MCP API获取数据

### Task 3: 创建会诊历史记录组件

**Files:**
- Create: `src/frontend/src/components/ConsultationHistoryList.vue`
- Modify: `src/frontend/src/views/PatientDashboardView.vue`

**Step 1: 创建历史记录列表组件**

展示患者的历次会诊记录：
- 会诊时间
- 主要结论
- 分诊科室
- 状态

---

## 第二阶段：会诊报告PDF导出

### Task 4: 创建PDF导出服务

**Files:**
- Create: `src/frontend/src/services/reportExport.ts`

**Step 1: 实现报告导出服务**

使用jsPDF实现：
- 标题和基本信息
- 分诊结论
- 证据依据
- 建议措施

```typescript
import { jsPDF } from 'jspdf';

export async function exportConsultationReport(
  report: ExplainableReport,
  triageResult: StructuredTriageResult,
  patientProfile: PatientProfile
): Promise<void> {
  const doc = new jsPDF();
  // 实现PDF内容生成
  doc.save(`会诊报告_${Date.now()}.pdf`);
}
```

### Task 5: 在会诊页面添加导出按钮

**Files:**
- Modify: `src/frontend/src/views/ConsultationView.vue`

**Step 1: 添加导出按钮**

在会诊结果展示区域添加"导出报告"按钮

**Step 2: 集成导出服务**

点击按钮调用reportExport服务

---

## 第三阶段：AI推理演示模式

### Task 6: 创建演示模式控制器

**Files:**
- Create: `src/frontend/src/composables/useDemoMode.ts`

**Step 1: 实现演示模式composable**

```typescript
import { ref, computed } from 'vue';

export function useDemoMode() {
  const isDemoMode = ref(false);
  const currentStep = ref(0);
  const isPaused = ref(false);
  const speed = ref(1); // 1x, 2x, 0.5x

  const steps = ref<DemoStep[]>([]);
  
  // 方法：开始/暂停/继续/重置
  function startDemo() {}
  function pauseDemo() {}
  function resumeDemo() {}
  function resetDemo() {}
  function nextStep() {}
  function setSpeed(s: number) {}

  return {
    isDemoMode,
    currentStep,
    isPaused,
    speed,
    steps,
    startDemo,
    pauseDemo,
    resumeDemo,
    resetDemo,
    nextStep,
    setSpeed,
  };
}
```

### Task 7: 创建推理步骤时间线组件

**Files:**
- Create: `src/frontend/src/components/DemoStepTimeline.vue`
- Modify: `src/frontend/src/views/ConsultationView.vue`

**Step 1: 创建演示时间线组件**

- 步骤列表
- 当前步骤高亮
- 步骤说明
- 播放控制栏（播放/暂停/速度/重置）

**Step 2: 集成到ConsultationView**

添加演示模式切换功能

---

## 第四阶段：患者档案页面增强

### Task 8: 完善患者档案页面

**Files:**
- Modify: `src/frontend/src/views/PatientDashboardView.vue`

**Step 1: 添加患者信息编辑功能**

**Step 2: 添加用药记录展示**

**Step 3: 添加随访计划时间线**

---

## 第五阶段：响应式和主题切换

### Task 9: 完善响应式布局

**Files:**
- Modify: `src/frontend/src/styles/theme.css`
- Modify: `src/frontend/src/App.vue`

**Step 1: 添加亮色主题变量**

**Step 2: 实现主题切换功能**

### Task 10: 更新导航栏

**Files:**
- Modify: `src/frontend/src/App.vue`
- Modify: `src/frontend/src/router/index.ts`

**Step 1: 添加新页面导航入口**

---

## 质量验证

### 运行测试

```bash
npm run test --workspace=@copilot-care/frontend
```

### 运行构建

```bash
npm run build --workspace=@copilot-care/frontend
```

### 运行质量门

```bash
npm run gate:all
```

---

## 依赖安装

在开始实现前，需要安装以下依赖：

```bash
npm install jspdf --workspace=@copilot-care/frontend
npm install @types/jspdf --workspace=@copilot-care/frontend -D
```
