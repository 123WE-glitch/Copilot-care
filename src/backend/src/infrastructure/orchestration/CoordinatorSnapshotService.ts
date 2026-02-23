import {
  OrchestrationGraphEdge,
  OrchestrationGraphNode,
  OrchestrationSnapshot,
  OrchestrationTask,
  OrchestrationTaskStatus,
  PatientProfile,
  TriageRoutingInfo,
  TriageStreamStageStatus,
  WorkflowStage,
} from '@copilot-care/shared/types';
import { postJson } from '../../llm/http';

interface StageRuntimeState {
  status: TriageStreamStageStatus;
  message: string;
}

export interface CoordinatorSnapshotContext {
  profile: PatientProfile;
  symptomText?: string;
  stageRuntime: Record<WorkflowStage, StageRuntimeState>;
  reasoning: string[];
  routeInfo?: TriageRoutingInfo;
  finalStatus?: string;
  mcpInsights?: string[];
}

interface CoordinatorRuntimeConfig {
  providerChain: string[];
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  deepseekApiKey?: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
  geminiApiKey?: string;
  geminiBaseUrl: string;
  geminiModel: string;
  kimiApiKey?: string;
  kimiBaseUrl: string;
  kimiModel: string;
}

const STAGE_ORDER: WorkflowStage[] = [
  'START',
  'INFO_GATHER',
  'RISK_ASSESS',
  'ROUTING',
  'DEBATE',
  'CONSENSUS',
  'REVIEW',
  'OUTPUT',
  'ESCALATION',
];

const STAGE_LABELS: Record<WorkflowStage, string> = {
  START: '启动',
  INFO_GATHER: '信息采集',
  RISK_ASSESS: '风险评估',
  ROUTING: '复杂度分流',
  DEBATE: '协同会诊',
  CONSENSUS: '共识收敛',
  REVIEW: '安全复核',
  OUTPUT: '输出报告',
  ESCALATION: '线下上转',
};

const STAGE_COLOR: Record<TriageStreamStageStatus, string> = {
  pending: '#9aa8b8',
  running: '#0e8d8f',
  blocked: '#c3472a',
  done: '#2e9156',
  failed: '#c3472a',
  skipped: '#bf8c1f',
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function parseProviderChain(value: string | undefined): string[] {
  const parsed = (value || 'deepseek,gemini,kimi')
    .split(/[,\|>\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(parsed)];
}

function nowIso(): string {
  return new Date().toISOString();
}

function toTaskStatus(
  status: TriageStreamStageStatus,
): OrchestrationTaskStatus {
  if (status === 'running') {
    return 'running';
  }
  if (status === 'blocked' || status === 'failed') {
    return 'blocked';
  }
  if (status === 'done' || status === 'skipped') {
    return 'done';
  }
  return 'pending';
}

function toTaskProgress(status: TriageStreamStageStatus): number {
  if (status === 'done' || status === 'skipped') {
    return 100;
  }
  if (status === 'running') {
    return 60;
  }
  if (status === 'blocked' || status === 'failed') {
    return 100;
  }
  return 0;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function buildRuleTasks(
  stageRuntime: Record<WorkflowStage, StageRuntimeState>,
): OrchestrationTask[] {
  const taskFromStage = (
    taskId: string,
    roleId: string,
    roleName: string,
    objective: string,
    stage: WorkflowStage,
  ): OrchestrationTask => ({
    taskId,
    roleId,
    roleName,
    objective,
    status: toTaskStatus(stageRuntime[stage].status),
    progress: toTaskProgress(stageRuntime[stage].status),
    latestUpdate: stageRuntime[stage].message,
  });

  const outputStatus = stageRuntime.OUTPUT.status;
  const overallStatus: OrchestrationTaskStatus =
    outputStatus === 'done'
      ? 'done'
      : stageRuntime.REVIEW.status === 'failed'
        ? 'blocked'
        : stageRuntime.START.status === 'pending'
          ? 'pending'
          : 'running';
  const overallProgress =
    outputStatus === 'done'
      ? 100
      : stageRuntime.START.status === 'pending'
        ? 0
        : Math.round(
            (STAGE_ORDER.filter((stage) => stageRuntime[stage].status !== 'pending')
              .length /
              STAGE_ORDER.length) *
              100,
          );

  return [
    {
      taskId: 'task_overall_orchestration',
      roleId: 'chief_coordinator',
      roleName: '总Agent',
      objective: '拆分任务、监督时序、汇总结论',
      status: overallStatus,
      progress: overallProgress,
      latestUpdate: stageRuntime.OUTPUT.message,
    },
    taskFromStage(
      'task_intake',
      'intake_agent',
      '信息采集Agent',
      '收集症状、授权和基础体征',
      'INFO_GATHER',
    ),
    taskFromStage(
      'task_risk',
      'risk_agent',
      '风险评估Agent',
      '结合规则完成风险分级',
      'RISK_ASSESS',
    ),
    taskFromStage(
      'task_routing',
      'routing_agent',
      '路由Agent',
      '决定同专科协同或多学科会诊路径',
      'ROUTING',
    ),
    taskFromStage(
      'task_debate',
      'specialist_panel',
      '专家协同Panel',
      '基于病情复杂度完成协同推理',
      'DEBATE',
    ),
    taskFromStage(
      'task_review',
      'reviewer_agent',
      '安全审校Agent',
      '复核风险边界并阻断不安全输出',
      'REVIEW',
    ),
  ];
}

function analyzePatientContext(
  profile: PatientProfile,
  symptomText?: string,
): {
  needsCardio: boolean;
  needsMetabolic: boolean;
  needsGP: boolean;
  needsSafety: boolean;
  complexity: 'low' | 'medium' | 'high';
  redFlags: string[];
} {
  const chiefComplaint = symptomText || profile.chiefComplaint || '';
  const complaintLower = chiefComplaint.toLowerCase();
  
  const cardioKeywords = ['胸闷', '胸痛', '心悸', '气促', '血压', '心脏', '心血管', '冠心病', '心肌'];
  const metabolicKeywords = ['血糖', '血脂', '糖尿病', '代谢', '肥胖', '血压高', '高血压'];
  const gpKeywords = ['发热', '咳嗽', '感冒', '头痛', '腹痛', '一般', '常见病'];
  const redFlagKeywords = ['胸痛剧烈', '呼吸困难', '意识丧失', '大出血', '休克', '濒死感'];
  
  const needsCardio = cardioKeywords.some(k => complaintLower.includes(k)) || 
    profile.chronicDiseases.includes('Hypertension') ||
    profile.chronicDiseases.includes('HeartDisease');
  const needsMetabolic = metabolicKeywords.some(k => complaintLower.includes(k)) ||
    profile.chronicDiseases.includes('Diabetes') ||
    profile.chronicDiseases.includes('Hyperlipidemia');
  const needsGP = gpKeywords.some(k => complaintLower.includes(k)) && !needsCardio && !needsMetabolic;
  const needsSafety = true;
  
  const redFlags = redFlagKeywords.filter(k => complaintLower.includes(k));
  
  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (profile.chronicDiseases.length >= 3 || redFlags.length > 0) {
    complexity = 'high';
  } else if (profile.chronicDiseases.length >= 1 || chiefComplaint.length > 20) {
    complexity = 'medium';
  }
  
  return { needsCardio, needsMetabolic, needsGP, needsSafety, complexity, redFlags };
}

function selectProviderForRole(role: string): { provider: string; model: string } {
  const roleProviderMap: Record<string, { provider: string; model: string }> = {
    cardio: { provider: 'deepseek', model: 'deepseek-chat' },
    metabolic: { provider: 'gemini', model: 'gemini-2.5-flash' },
    gp: { provider: 'gemini', model: 'gemini-2.5-flash' },
    safety: { provider: 'kimi', model: 'moonshot-v1-8k' },
  };
  return roleProviderMap[role] || { provider: 'deepseek', model: 'deepseek-chat' };
}

function buildDynamicTasks(
  context: CoordinatorSnapshotContext,
  phase: OrchestrationSnapshot['phase'],
): OrchestrationTask[] {
  const { profile, symptomText, stageRuntime, routeInfo } = context;
  const analysis = analyzePatientContext(profile, symptomText);
  const tasks: OrchestrationTask[] = [];
  const now = new Date().toISOString();
  
  tasks.push({
    taskId: 'task_overall_coordinator',
    roleId: 'chief_coordinator',
    roleName: '总Agent',
    objective: '理解需求、动态拆解任务、分配到专业Agent、汇总结果',
    status: phase === 'complete' ? 'done' : 'running',
    progress: phase === 'complete' ? 100 : 60,
    latestUpdate: `已分析患者情况：复杂度${analysis.complexity}，需要心血管${analysis.needsCardio ? '✓' : '✗'}、代谢${analysis.needsMetabolic ? '✓' : '✗'}、全科${analysis.needsGP ? '✓' : '✗'}、安全${analysis.needsSafety ? '✓' : '✗'}`,
    startTime: now,
  });
  
  if (phase === 'assignment' || phase === 'analysis' || phase === 'execution' || phase === 'synthesis') {
    const subTasks: OrchestrationTask[] = [];
    
    if (analysis.needsCardio) {
      const providerInfo = selectProviderForRole('cardio');
      subTasks.push({
        taskId: 'sub_task_cardio',
        roleId: 'cardio_agent',
        roleName: '心内专科Agent',
        objective: '心血管风险评估与分诊建议',
        status: stageRuntime?.RISK_ASSESS?.status === 'done' ? 'done' : 
                stageRuntime?.RISK_ASSESS?.status === 'running' ? 'running' : 'pending',
        progress: stageRuntime?.RISK_ASSESS?.status === 'done' ? 100 : 0,
        provider: providerInfo.provider,
        parentTaskId: 'task_overall_coordinator',
      });
    }
    
    if (analysis.needsMetabolic) {
      const providerInfo = selectProviderForRole('metabolic');
      subTasks.push({
        taskId: 'sub_task_metabolic',
        roleId: 'metabolic_agent',
        roleName: '代谢专科Agent',
        objective: '代谢综合征筛查与风险评估',
        status: stageRuntime?.RISK_ASSESS?.status === 'done' ? 'done' : 
                stageRuntime?.RISK_ASSESS?.status === 'running' ? 'running' : 'pending',
        progress: stageRuntime?.RISK_ASSESS?.status === 'done' ? 100 : 0,
        provider: providerInfo.provider,
        parentTaskId: 'task_overall_coordinator',
      });
    }
    
    if (analysis.needsGP) {
      const providerInfo = selectProviderForRole('gp');
      subTasks.push({
        taskId: 'sub_task_gp',
        roleId: 'gp_agent',
        roleName: '全科Agent',
        objective: '综合健康评估与常见病筛查',
        status: stageRuntime?.RISK_ASSESS?.status === 'done' ? 'done' : 
                stageRuntime?.RISK_ASSESS?.status === 'running' ? 'running' : 'pending',
        progress: stageRuntime?.RISK_ASSESS?.status === 'done' ? 100 : 0,
        provider: providerInfo.provider,
        parentTaskId: 'task_overall_coordinator',
      });
    }
    
    if (analysis.needsSafety) {
      subTasks.push({
        taskId: 'sub_task_safety',
        roleId: 'safety_agent',
        roleName: '安全审校Agent',
        objective: '红线检测与风险边界复核',
        status: stageRuntime?.REVIEW?.status === 'done' ? 'done' : 
                stageRuntime?.REVIEW?.status === 'running' ? 'running' : 'pending',
        progress: stageRuntime?.REVIEW?.status === 'done' ? 100 : 0,
        provider: 'kimi',
        parentTaskId: 'task_overall_coordinator',
      });
    }
    
    if (subTasks.length > 0) {
      tasks[0].subTasks = subTasks;
    }
  }
  
  tasks.push({
    taskId: 'task_intake',
    roleId: 'intake_agent',
    roleName: '信息采集Agent',
    objective: '收集症状、授权和基础体征',
    status: toTaskStatus(stageRuntime?.INFO_GATHER?.status || 'pending'),
    progress: toTaskProgress(stageRuntime?.INFO_GATHER?.status || 'pending'),
    latestUpdate: stageRuntime?.INFO_GATHER?.message,
    startTime: now,
  });
  
  if (routeInfo) {
    tasks.push({
      taskId: 'task_routing',
      roleId: 'routing_agent',
      roleName: '路由Agent',
      objective: `复杂度评分${routeInfo.complexityScore}，路由模式${routeInfo.routeMode}`,
      status: toTaskStatus(stageRuntime?.ROUTING?.status || 'pending'),
      progress: toTaskProgress(stageRuntime?.ROUTING?.status || 'pending'),
      latestUpdate: `路由决策：${routeInfo.department} + ${routeInfo.collaborationMode}`,
    });
  }
  
  tasks.push({
    taskId: 'task_debate',
    roleId: 'specialist_panel',
    roleName: '专家协同Panel',
    objective: '基于病情复杂度完成协同推理',
    status: toTaskStatus(stageRuntime?.DEBATE?.status || 'pending'),
    progress: toTaskProgress(stageRuntime?.DEBATE?.status || 'pending'),
    latestUpdate: stageRuntime?.DEBATE?.message,
    startTime: now,
  });
  
  tasks.push({
    taskId: 'task_review',
    roleId: 'reviewer_agent',
    roleName: '安全审校Agent',
    objective: '复核风险边界并阻断不安全输出',
    status: toTaskStatus(stageRuntime?.REVIEW?.status || 'pending'),
    progress: toTaskProgress(stageRuntime?.REVIEW?.status || 'pending'),
    latestUpdate: stageRuntime?.REVIEW?.message,
    startTime: now,
  });
  
  tasks.push({
    taskId: 'task_output',
    roleId: 'output_agent',
    roleName: '输出Agent',
    objective: '生成可解释报告与随访计划',
    status: toTaskStatus(stageRuntime?.OUTPUT?.status || 'pending'),
    progress: toTaskProgress(stageRuntime?.OUTPUT?.status || 'pending'),
    latestUpdate: stageRuntime?.OUTPUT?.message,
    startTime: now,
  });
  
  return tasks;
}

function buildRuleGraph(
  context: CoordinatorSnapshotContext,
): { nodes: OrchestrationGraphNode[]; edges: OrchestrationGraphEdge[] } {
  const nodes: OrchestrationGraphNode[] = [];
  const edges: OrchestrationGraphEdge[] = [];

  nodes.push({
    id: 'input',
    label: truncate(context.symptomText?.trim() || '当前需求', 24),
    kind: 'input',
    detail: context.symptomText || context.profile.chiefComplaint || '待补充',
    color: '#406c9d',
    emphasis: 1,
  });

  STAGE_ORDER.forEach((stage, index) => {
    const state = context.stageRuntime[stage];
    nodes.push({
      id: `stage_${stage.toLowerCase()}`,
      label: STAGE_LABELS[stage],
      kind: 'stage',
      detail: state.message,
      color: STAGE_COLOR[state.status],
      emphasis: state.status === 'running' ? 1 : 0,
    });
    if (index === 0) {
      edges.push({
        source: 'input',
        target: `stage_${stage.toLowerCase()}`,
        label: '触发',
      });
    }
    if (index > 0) {
      edges.push({
        source: `stage_${STAGE_ORDER[index - 1].toLowerCase()}`,
        target: `stage_${stage.toLowerCase()}`,
      });
    }
  });

  const evidence = context.reasoning
    .filter((item) => item.trim().length > 0)
    .slice(-4);
  evidence.forEach((item, index) => {
    const evidenceId = `evidence_${index + 1}`;
    nodes.push({
      id: evidenceId,
      label: truncate(item, 20),
      kind: 'evidence',
      detail: item,
      color: '#2e9156',
      emphasis: 0,
    });
    edges.push({
      source: 'stage_risk_assess',
      target: evidenceId,
      style: 'dashed',
    });
    edges.push({
      source: evidenceId,
      target: 'stage_consensus',
      style: 'dashed',
    });
  });

  if (context.routeInfo) {
    nodes.push({
      id: 'route_decision',
      label: `${context.routeInfo.routeMode}`,
      kind: 'decision',
      detail: `department=${context.routeInfo.department}; mode=${context.routeInfo.collaborationMode}; complexity=${context.routeInfo.complexityScore}`,
      color: '#1f7b80',
      emphasis: 1,
    });
    edges.push({
      source: 'stage_routing',
      target: 'route_decision',
      label: '决策',
    });
    edges.push({
      source: 'route_decision',
      target: 'stage_debate',
    });
  }

  if (context.mcpInsights && context.mcpInsights.length > 0) {
    nodes.push({
      id: 'mcp_context',
      label: 'MCP患者云端上下文',
      kind: 'evidence',
      detail: context.mcpInsights.join('\n'),
      color: '#6b7f96',
    });
    edges.push({
      source: 'input',
      target: 'mcp_context',
      label: '补充',
      style: 'dashed',
    });
    edges.push({
      source: 'mcp_context',
      target: 'stage_risk_assess',
      style: 'dashed',
    });
  }

  nodes.push({
    id: 'coordinator',
    label: '总Agent',
    kind: 'agent',
    detail: '负责任务分配、进度监督与总结汇报',
    color: '#2f5878',
  });
  edges.push({
    source: 'coordinator',
    target: 'stage_info_gather',
    label: '分配',
  });
  edges.push({
    source: 'coordinator',
    target: 'stage_review',
    label: '审查',
  });
  edges.push({
    source: 'coordinator',
    target: 'stage_output',
    label: '汇总',
  });

  return { nodes, edges };
}

function buildPhaseSummary(
  phase: OrchestrationSnapshot['phase'],
  context: CoordinatorSnapshotContext,
): string {
  if (phase === 'assignment') {
    return '总Agent已完成任务拆分，信息采集与风险评估任务开始排队执行。';
  }
  if (phase === 'analysis') {
    return '总Agent正在汇总风险证据并推进复杂度分流判定。';
  }
  if (phase === 'execution') {
    return '总Agent正在监督专家协同与共识收敛过程。';
  }
  if (phase === 'synthesis') {
    return '总Agent正在整合结论、解释依据与后续行动建议。';
  }
  const finalStatus = context.finalStatus || 'OUTPUT';
  return `总Agent已完成最终汇报，当前会诊状态：${finalStatus}。`;
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function extractOpenAIContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  const choices = (payload as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return '';
  }
  const message = (choices[0] as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') {
    return '';
  }
  const content = (message as Record<string, unknown>).content;
  return typeof content === 'string' ? content : '';
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  const candidates = (payload as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates)) {
    return '';
  }
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }
    const content = (candidate as Record<string, unknown>).content;
    if (!content || typeof content !== 'object') {
      continue;
    }
    const parts = (content as Record<string, unknown>).parts;
    if (!Array.isArray(parts)) {
      continue;
    }
    for (const part of parts) {
      if (!part || typeof part !== 'object') {
        continue;
      }
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string' && text.trim()) {
        return text;
      }
    }
  }
  return '';
}

function sanitizeTaskStatus(value: unknown): OrchestrationTaskStatus {
  if (value === 'running' || value === 'done' || value === 'blocked') {
    return value;
  }
  return 'pending';
}

function sanitizeGraphNodeKind(value: unknown): OrchestrationGraphNode['kind'] {
  if (
    value === 'input' ||
    value === 'stage' ||
    value === 'decision' ||
    value === 'evidence' ||
    value === 'risk' ||
    value === 'output' ||
    value === 'agent'
  ) {
    return value;
  }
  return 'decision';
}

function mergeModelTasksWithFallback(
  modelTasks: OrchestrationTask[],
  fallbackTasks: OrchestrationTask[],
): OrchestrationTask[] {
  return fallbackTasks.map((fallbackTask) => {
    const modelTask = modelTasks.find((candidate) => {
      return candidate.taskId === fallbackTask.taskId
        || candidate.roleId === fallbackTask.roleId
        || candidate.roleName === fallbackTask.roleName;
    });

    if (!modelTask) {
      return fallbackTask;
    }

    return {
      ...fallbackTask,
      objective: modelTask.objective || fallbackTask.objective,
      latestUpdate: modelTask.latestUpdate || fallbackTask.latestUpdate,
    };
  });
}

function sanitizeModelSnapshot(
  payload: unknown,
  fallback: OrchestrationSnapshot,
): OrchestrationSnapshot | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const source = payload as Record<string, unknown>;
  const summary =
    typeof source.summary === 'string' && source.summary.trim()
      ? source.summary.trim()
      : fallback.summary;

  const taskCandidate = Array.isArray(source.tasks) ? source.tasks : [];
  const tasks: OrchestrationTask[] = [];
  if (taskCandidate.length > 0) {
    taskCandidate.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        return;
      }
      const task = item as Record<string, unknown>;
      const objective =
        typeof task.objective === 'string' && task.objective.trim()
          ? task.objective.trim()
          : '';
      if (!objective) {
        return;
      }
      const progressValue =
        typeof task.progress === 'number' && Number.isFinite(task.progress)
          ? task.progress
          : typeof task.progress === 'string'
            ? Number(task.progress)
            : 0;
      tasks.push({
        taskId:
          typeof task.taskId === 'string' && task.taskId.trim()
            ? task.taskId.trim()
            : `model_task_${index + 1}`,
        roleId:
          typeof task.roleId === 'string' && task.roleId.trim()
            ? task.roleId.trim()
            : `model_role_${index + 1}`,
        roleName:
          typeof task.roleName === 'string' && task.roleName.trim()
            ? task.roleName.trim()
            : `Agent-${index + 1}`,
        objective,
        status: sanitizeTaskStatus(task.status),
        progress: Math.max(0, Math.min(100, Number(progressValue) || 0)),
        latestUpdate:
          typeof task.latestUpdate === 'string' && task.latestUpdate.trim()
            ? task.latestUpdate.trim()
            : undefined,
      });
    });
  }

  const graph = source.graph && typeof source.graph === 'object'
    ? (source.graph as Record<string, unknown>)
    : null;
  const nodeCandidate = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
  const edgeCandidate = graph && Array.isArray(graph.edges) ? graph.edges : [];

  const nodes: OrchestrationGraphNode[] = [];
  if (nodeCandidate.length > 0) {
    nodeCandidate.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        return;
      }
      const node = item as Record<string, unknown>;
      const label =
        typeof node.label === 'string' && node.label.trim()
          ? node.label.trim()
          : '';
      if (!label) {
        return;
      }
      nodes.push({
        id:
          typeof node.id === 'string' && node.id.trim()
            ? node.id.trim()
            : `model_node_${index + 1}`,
        label,
        kind: sanitizeGraphNodeKind(node.kind),
        detail:
          typeof node.detail === 'string' && node.detail.trim()
            ? node.detail.trim()
            : undefined,
        color:
          typeof node.color === 'string' && node.color.trim()
            ? node.color.trim()
            : undefined,
        emphasis:
          typeof node.emphasis === 'number' && Number.isFinite(node.emphasis)
            ? node.emphasis
            : undefined,
      });
    });
  }

  const validNodeIdSet = new Set(nodes.map((node) => node.id));
  const edges: OrchestrationGraphEdge[] = [];
  if (edgeCandidate.length > 0) {
    edgeCandidate.forEach((item) => {
      if (!item || typeof item !== 'object') {
        return;
      }
      const edge = item as Record<string, unknown>;
      if (
        typeof edge.source !== 'string' ||
        typeof edge.target !== 'string' ||
        !validNodeIdSet.has(edge.source) ||
        !validNodeIdSet.has(edge.target)
      ) {
        return;
      }
      edges.push({
        source: edge.source,
        target: edge.target,
        label:
          typeof edge.label === 'string' && edge.label.trim()
            ? edge.label.trim()
            : undefined,
        style:
          edge.style === 'dashed' || edge.style === 'solid'
            ? edge.style
            : undefined,
        weight:
          typeof edge.weight === 'number' && Number.isFinite(edge.weight)
            ? edge.weight
            : undefined,
      });
    });
  }

  return {
    ...fallback,
    summary,
    tasks: tasks.length > 0
      ? mergeModelTasksWithFallback(tasks, fallback.tasks)
      : fallback.tasks,
    graph: {
      nodes: nodes.length > 0 ? nodes : fallback.graph.nodes,
      edges: edges.length > 0 ? edges : fallback.graph.edges,
    },
    source: 'model',
    generatedAt: nowIso(),
  };
}

function buildPrompt(
  fallback: OrchestrationSnapshot,
  context: CoordinatorSnapshotContext,
): string {
  return JSON.stringify(
    {
      task: '作为总Agent，输出当前会诊任务分配与推理流程图',
      outputLanguage: 'Simplified Chinese',
      outputFormat: 'JSON only',
      constraints: [
        '禁止给出确诊与处方',
        '仅给出可解释分诊建议',
        '每个任务必须有status与progress',
      ],
      requiredSchema: {
        summary: 'string',
        tasks: [
          {
            taskId: 'string',
            roleId: 'string',
            roleName: 'string',
            objective: 'string',
            status: 'pending|running|done|blocked',
            progress: '0..100',
            latestUpdate: 'string',
          },
        ],
        graph: {
          nodes: [
            {
              id: 'string',
              label: 'string',
              kind: 'input|stage|decision|evidence|risk|output|agent',
              detail: 'string',
              color: '#hex',
              emphasis: 'number',
            },
          ],
          edges: [
            {
              source: 'string',
              target: 'string',
              label: 'string',
              style: 'solid|dashed',
              weight: 'number',
            },
          ],
        },
      },
      input: {
        symptomText: context.symptomText || context.profile.chiefComplaint || '',
        profile: {
          age: context.profile.age,
          sex: context.profile.sex,
          chronicDiseases: context.profile.chronicDiseases,
          medicationHistory: context.profile.medicationHistory,
          vitals: context.profile.vitals,
        },
        stageRuntime: context.stageRuntime,
        routeInfo: context.routeInfo,
        finalStatus: context.finalStatus,
        mcpInsights: context.mcpInsights ?? [],
        recentReasoning: context.reasoning.slice(-8),
      },
      baselineSnapshot: fallback,
    },
    null,
    2,
  );
}

function parseCoordinatorConfig(env: NodeJS.ProcessEnv): CoordinatorRuntimeConfig {
  return {
    providerChain: parseProviderChain(env.COPILOT_CARE_COORDINATOR_PROVIDER),
    timeoutMs: parsePositiveInt(env.COPILOT_CARE_COORDINATOR_TIMEOUT_MS, 240000),
    maxRetries: parsePositiveInt(env.COPILOT_CARE_COORDINATOR_MAX_RETRIES, 1),
    retryDelayMs: parsePositiveInt(env.COPILOT_CARE_COORDINATOR_RETRY_DELAY_MS, 300),
    deepseekApiKey: env.DEEPSEEK_API_KEY,
    deepseekBaseUrl: env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    deepseekModel: env.DEEPSEEK_COORDINATOR_MODEL || env.DEEPSEEK_LLM_MODEL || 'deepseek-chat',
    geminiApiKey: env.GEMINI_API_KEY,
    geminiBaseUrl:
      env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    geminiModel: env.GEMINI_COORDINATOR_MODEL || env.GEMINI_LLM_MODEL || 'gemini-2.5-flash',
    kimiApiKey: env.KIMI_API_KEY,
    kimiBaseUrl: env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
    kimiModel: env.KIMI_COORDINATOR_MODEL || env.KIMI_LLM_MODEL || 'moonshot-v1-8k',
  };
}

async function requestWithOpenAICompatibleProvider(
  provider: 'deepseek' | 'kimi',
  config: CoordinatorRuntimeConfig,
  prompt: string,
): Promise<string> {
  const apiKey =
    provider === 'deepseek' ? config.deepseekApiKey : config.kimiApiKey;
  const model =
    provider === 'deepseek' ? config.deepseekModel : config.kimiModel;
  const baseUrl =
    provider === 'deepseek' ? config.deepseekBaseUrl : config.kimiBaseUrl;

  if (!apiKey) {
    return '';
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const payload = await postJson({
    url: endpoint,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    retryDelayMs: config.retryDelayMs,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: {
      model,
      temperature: 0.1,
      max_tokens: 1200,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content:
            '你是医疗会诊的总Agent。只能输出JSON对象，不要Markdown，不要额外解释。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
  });

  return extractOpenAIContent(payload);
}

async function requestWithGeminiProvider(
  config: CoordinatorRuntimeConfig,
  prompt: string,
): Promise<string> {
  if (!config.geminiApiKey) {
    return '';
  }
  const model = encodeURIComponent(config.geminiModel);
  const endpoint =
    `${config.geminiBaseUrl.replace(/\/+$/, '')}/models/${model}:generateContent` +
    `?key=${encodeURIComponent(config.geminiApiKey)}`;
  const payload = await postJson({
    url: endpoint,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    retryDelayMs: config.retryDelayMs,
    headers: {},
    body: {
      systemInstruction: {
        parts: [
          {
            text: '你是医疗会诊总Agent，只能输出JSON对象，不要Markdown和解释文本。',
          },
        ],
      },
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1200,
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    },
  });
  return extractGeminiText(payload);
}

export class CoordinatorSnapshotService {
  private readonly config: CoordinatorRuntimeConfig;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.config = parseCoordinatorConfig(env);
  }

  public createRuleSnapshot(
    context: CoordinatorSnapshotContext,
    phase: OrchestrationSnapshot['phase'],
  ): OrchestrationSnapshot {
    const tasks = buildRuleTasks(context.stageRuntime);
    const graph = buildRuleGraph(context);
    return {
      coordinator: '总Agent',
      phase,
      summary: buildPhaseSummary(phase, context),
      tasks,
      graph,
      generatedAt: nowIso(),
      source: 'rule',
    };
  }

  public async createModelSnapshot(
    context: CoordinatorSnapshotContext,
    phase: OrchestrationSnapshot['phase'],
  ): Promise<OrchestrationSnapshot | null> {
    const fallback = this.createRuleSnapshot(context, phase);
    const prompt = buildPrompt(fallback, context);

    for (const provider of this.config.providerChain) {
      try {
        let text = '';
        if (provider === 'deepseek' || provider === 'kimi') {
          text = await requestWithOpenAICompatibleProvider(
            provider,
            this.config,
            prompt,
          );
        } else if (provider === 'gemini') {
          text = await requestWithGeminiProvider(this.config, prompt);
        } else {
          continue;
        }

        if (!text.trim()) {
          continue;
        }

        const candidateText = extractJsonObject(text) || text;
        const parsed = JSON.parse(candidateText) as unknown;
        const snapshot = sanitizeModelSnapshot(parsed, fallback);
        if (snapshot) {
          return snapshot;
        }
      } catch {
        continue;
      }
    }

    return null;
  }
}
