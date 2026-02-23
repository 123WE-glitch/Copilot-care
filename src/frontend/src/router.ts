import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'consultation',
    component: () => import('./views/ConsultationView.vue'),
    meta: {
      title: '会诊工作台',
      icon: 'CS',
      description: '执行实时分诊流程，并查看可追溯的临床推理链路。',
    },
  },
  {
    path: '/governance',
    name: 'governance',
    component: () => import('./views/GovernanceView.vue'),
    meta: {
      title: '治理看板',
      icon: 'GV',
      description: '监控质量门禁、复核队列与风险触发信号。',
    },
  },
  {
    path: '/fhir',
    name: 'fhir',
    component: () => import('./views/FhirExplorerView.vue'),
    meta: {
      title: 'FHIR 资源浏览',
      icon: 'FH',
      description: '查看互操作资源与结构化载荷详情。',
    },
  },
  {
    path: '/patient/:id?',
    name: 'patient-dashboard',
    component: () => import('./views/PatientDashboardView.vue'),
    meta: {
      title: '患者看板',
      icon: 'PT',
      description: '查看患者纵向趋势与历史会诊记录。',
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string;
  if (title) {
    document.title = `${title} - CoPilot Care`;
  }
  next();
});

export default router;

export const navItems = routes.map((route) => ({
  path: route.path,
  label: route.meta?.title as string,
  icon: route.meta?.icon as string,
  description: route.meta?.description as string,
}));
