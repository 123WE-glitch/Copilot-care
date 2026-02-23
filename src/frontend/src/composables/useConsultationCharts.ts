import type {
  OrchestrationGraphEdge,
  OrchestrationGraphNode,
  OrchestrationSnapshot,
  TriageStreamStageStatus,
  WorkflowStage,
} from '@copilot-care/shared/types';

export type ConsultationReasoningKind =
  | 'system'
  | 'evidence'
  | 'decision'
  | 'warning'
  | 'query';

export interface ConsultationStageRuntimeState {
  status: TriageStreamStageStatus;
  message: string;
}

export interface ConsultationReasoningMapNodeDetail {
  id: string;
  title: string;
  summary: string;
  raw?: string;
  category: 'input' | 'decision' | 'evidence' | 'status' | 'conclusion';
}

export interface ConsultationReasoningMapModel {
  option: Record<string, unknown>;
  details: Record<string, ConsultationReasoningMapNodeDetail>;
  defaultSelectedId: string | null;
}

interface BuildFlowChartOptionInput {
  flowStages: WorkflowStage[];
  stageLabels: Record<WorkflowStage, string>;
  stageRuntime: Record<WorkflowStage, ConsultationStageRuntimeState>;
}

interface BuildFallbackReasoningMapModelInput {
  symptomText: string;
  department?: string;
  routeMode?: string;
  collaboration?: string;
  statusValue: string;
  statusLabel: string;
  conclusionText: string;
  typedOutput: string;
  reasoningItems: Array<{ kind: ConsultationReasoningKind; text: string }>;
  showEvidenceBranches: boolean;
  reasoningKindLabels: Record<ConsultationReasoningKind, string>;
  routeModeLabels: Record<string, string>;
  departmentLabels: Record<string, string>;
  collaborationLabels: Record<string, string>;
}

interface BuildReasoningMapModelInput {
  snapshot: OrchestrationSnapshot | null;
  fallback: BuildFallbackReasoningMapModelInput;
}

const FLOW_NODE_POSITIONS: Record<WorkflowStage, [number, number]> = {
  START: [0, 20],
  INFO_GATHER: [170, 20],
  RISK_ASSESS: [340, 20],
  ROUTING: [510, 20],
  DEBATE: [680, 20],
  CONSENSUS: [850, 20],
  REVIEW: [1020, 20],
  OUTPUT: [1190, 20],
  ESCALATION: [680, 170],
};

function stageColor(statusValue: TriageStreamStageStatus): string {
  if (statusValue === 'running') return '#0e8d8f';
  if (statusValue === 'done') return '#2e9156';
  if (statusValue === 'failed' || statusValue === 'blocked') return '#c3472a';
  if (statusValue === 'skipped') return '#bf8c1f';
  return '#9aa8b8';
}

function formatNodeText(text: string, maxLength: number = 22): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function resolveSnapshotNodeColor(node: OrchestrationGraphNode): string {
  if (node.color) {
    return node.color;
  }
  const colorByKind: Record<OrchestrationGraphNode['kind'], string> = {
    input: '#406c9d',
    stage: '#1f7b80',
    decision: '#2a6f93',
    evidence: '#2e9156',
    risk: '#bf8c1f',
    output: '#276566',
    agent: '#5d6f8d',
  };
  return colorByKind[node.kind] ?? '#6b7f96';
}

function mapSnapshotNodeCategory(
  kind: OrchestrationGraphNode['kind'],
): ConsultationReasoningMapNodeDetail['category'] {
  if (kind === 'input') {
    return 'input';
  }
  if (kind === 'output') {
    return 'conclusion';
  }
  if (kind === 'evidence') {
    return 'evidence';
  }
  if (kind === 'agent') {
    return 'status';
  }
  return 'decision';
}

function formatLabel(value: string | undefined, labels: Record<string, string>, fallback: string): string {
  if (!value) {
    return fallback;
  }
  return labels[value] ?? value;
}

function buildSnapshotReasoningMapModel(
  snapshot: OrchestrationSnapshot,
): ConsultationReasoningMapModel | null {
  if (snapshot.graph.nodes.length === 0) {
    return null;
  }

  const details: Record<string, ConsultationReasoningMapNodeDetail> = {};
  const chartNodes = snapshot.graph.nodes.map((node) => {
    details[node.id] = {
      id: node.id,
      title: node.label,
      summary: node.detail || node.label,
      raw: node.detail,
      category: mapSnapshotNodeCategory(node.kind),
    };

    return {
      id: node.id,
      name: formatNodeText(node.label, 20),
      symbolSize: 52 + (node.emphasis ? Math.min(16, node.emphasis * 10) : 0),
      itemStyle: {
        color: resolveSnapshotNodeColor(node),
        borderColor: '#102738',
        borderWidth: 1,
      },
      label: {
        color: '#ffffff',
        fontSize: 11,
      },
      tooltip: {
        formatter: `${node.label}<br/>${node.detail || ''}`,
      },
    };
  });

  const validNodeIds = new Set(snapshot.graph.nodes.map((node) => node.id));
  const chartLinks = snapshot.graph.edges
    .filter(
      (edge: OrchestrationGraphEdge) =>
        validNodeIds.has(edge.source) && validNodeIds.has(edge.target),
    )
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      value: edge.label || '',
      lineStyle: {
        type: edge.style === 'dashed' ? 'dashed' : 'solid',
        width: edge.weight ? Math.max(1, Math.min(5, edge.weight)) : 2,
        opacity: 0.85,
        color: '#7392ad',
      },
      label: edge.label
        ? {
            show: true,
            formatter: edge.label,
            color: '#42627c',
            fontSize: 11,
          }
        : undefined,
    }));

  return {
    option: {
      animationDurationUpdate: 260,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#102738',
        borderColor: '#2f4f68',
        textStyle: { color: '#f7fbff' },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: false,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 8,
          force: {
            repulsion: 260,
            gravity: 0.08,
            edgeLength: [120, 210],
          },
          data: chartNodes,
          links: chartLinks,
          lineStyle: {
            color: '#7392ad',
            width: 2,
            opacity: 0.85,
          },
        },
      ],
      grid: { top: 0, left: 0, right: 0, bottom: 0 },
    },
    details,
    defaultSelectedId: snapshot.graph.nodes[snapshot.graph.nodes.length - 1]?.id || null,
  };
}

function buildFallbackReasoningMapModel(
  input: BuildFallbackReasoningMapModelInput,
): ConsultationReasoningMapModel {
  const kindColor: Record<ConsultationReasoningKind, string> = {
    system: '#5d7893',
    evidence: '#2e9156',
    decision: '#0e8d8f',
    warning: '#c3472a',
    query: '#bf8c1f',
  };

  const evidenceCandidates = input.reasoningItems
    .filter((item) => item.kind !== 'system')
    .slice(-18)
    .reverse();

  const evidenceTexts: Array<{ kind: ConsultationReasoningKind; text: string }> = [];
  for (const item of evidenceCandidates) {
    if (evidenceTexts.some((evidence) => evidence.text === item.text)) {
      continue;
    }
    evidenceTexts.push({ kind: item.kind, text: item.text });
    if (evidenceTexts.length >= 4) {
      break;
    }
  }
  evidenceTexts.reverse();

  const details: Record<string, ConsultationReasoningMapNodeDetail> = {};
  const registerNodeDetail = (detail: ConsultationReasoningMapNodeDetail): void => {
    details[detail.id] = detail;
  };

  const statusColor =
    input.statusValue === 'ERROR'
      ? '#c3472a'
      : input.statusValue === 'ESCALATE_TO_OFFLINE'
        ? '#bf8c1f'
        : '#2e9156';

  const nodes: Array<Record<string, unknown>> = [
    {
      id: 'input',
      name: `需求\n${formatNodeText(input.symptomText, 20)}`,
      x: 70,
      y: 120,
      symbolSize: 74,
      itemStyle: { color: '#406c9d' },
      label: { color: '#ffffff', fontSize: 12, lineHeight: 16 },
    },
    {
      id: 'dept',
      name: `分诊\n${formatNodeText(formatLabel(input.department, input.departmentLabels, '判定中'), 18)}`,
      x: 280,
      y: 60,
      symbolSize: 68,
      itemStyle: { color: '#1f7b80' },
      label: { color: '#ffffff', fontSize: 12, lineHeight: 16 },
    },
    {
      id: 'route',
      name: `分流\n${formatNodeText(formatLabel(input.routeMode, input.routeModeLabels, '计算中'), 18)}`,
      x: 500,
      y: 60,
      symbolSize: 68,
      itemStyle: { color: '#2a6f93' },
      label: { color: '#ffffff', fontSize: 12, lineHeight: 16 },
    },
    {
      id: 'collab',
      name: `协同\n${formatNodeText(formatLabel(input.collaboration, input.collaborationLabels, '准备中'), 18)}`,
      x: 720,
      y: 60,
      symbolSize: 68,
      itemStyle: { color: '#5d6f8d' },
      label: { color: '#ffffff', fontSize: 12, lineHeight: 16 },
    },
    {
      id: 'status',
      name: `状态\n${formatNodeText(input.statusLabel, 18)}`,
      x: 930,
      y: 60,
      symbolSize: 68,
      itemStyle: { color: statusColor },
      label: { color: '#ffffff', fontSize: 12, lineHeight: 16 },
    },
    {
      id: 'conclusion',
      name: `结论\n${formatNodeText(input.conclusionText.replace(/\s+/g, ' '), 20)}`,
      x: 930,
      y: 210,
      symbolSize: 74,
      itemStyle: { color: '#276566' },
      label: { color: '#ffffff', fontSize: 12, lineHeight: 16 },
    },
  ];

  registerNodeDetail({
    id: 'input',
    title: '输入需求',
    summary: input.symptomText,
    raw: input.symptomText,
    category: 'input',
  });
  registerNodeDetail({
    id: 'dept',
    title: '首轮分诊',
    summary: formatLabel(input.department, input.departmentLabels, '分诊判定中'),
    raw: input.department ? `department=${input.department}` : undefined,
    category: 'decision',
  });
  registerNodeDetail({
    id: 'route',
    title: '复杂度分流',
    summary: formatLabel(input.routeMode, input.routeModeLabels, '分流计算中'),
    raw: input.routeMode ? `routeMode=${input.routeMode}` : undefined,
    category: 'decision',
  });
  registerNodeDetail({
    id: 'collab',
    title: '协同模式',
    summary: formatLabel(input.collaboration, input.collaborationLabels, '协同模式准备中'),
    raw: input.collaboration,
    category: 'decision',
  });
  registerNodeDetail({
    id: 'status',
    title: '当前状态',
    summary: input.statusLabel,
    raw: input.statusValue,
    category: 'status',
  });
  registerNodeDetail({
    id: 'conclusion',
    title: '可解释结论',
    summary: input.conclusionText,
    raw: input.typedOutput.trim() || input.conclusionText,
    category: 'conclusion',
  });

  const links: Array<Record<string, unknown>> = [
    { source: 'input', target: 'dept' },
    { source: 'dept', target: 'route' },
    { source: 'route', target: 'collab' },
    { source: 'collab', target: 'status' },
    { source: 'status', target: 'conclusion' },
  ];

  if (input.showEvidenceBranches) {
    evidenceTexts.forEach((item, index) => {
      const nodeId = `evidence-${index}`;
      nodes.push({
        id: nodeId,
        name: `${input.reasoningKindLabels[item.kind]}\n${formatNodeText(item.text, 18)}`,
        x: 300 + index * 180,
        y: 220,
        symbolSize: 58,
        itemStyle: { color: kindColor[item.kind] },
        label: { color: '#ffffff', fontSize: 11, lineHeight: 15 },
      });
      registerNodeDetail({
        id: nodeId,
        title: `${input.reasoningKindLabels[item.kind]}证据节点`,
        summary: item.text,
        raw: item.text,
        category: 'evidence',
      });
      links.push({
        source: 'route',
        target: nodeId,
        lineStyle: { type: 'dashed', opacity: 0.7 },
      });
      links.push({
        source: nodeId,
        target: 'status',
        lineStyle: { opacity: 0.75 },
      });
    });
  } else if (evidenceTexts.length > 0) {
    const collapsedId = 'evidence-collapsed';
    const mergedSummary = evidenceTexts
      .map((item, index) => `${index + 1}. ${item.text}`)
      .join('\n');
    nodes.push({
      id: collapsedId,
      name: `证据分支\n${evidenceTexts.length} 条已折叠`,
      x: 570,
      y: 220,
      symbolSize: 62,
      itemStyle: { color: '#6b7f96' },
      label: { color: '#ffffff', fontSize: 11, lineHeight: 15 },
    });
    registerNodeDetail({
      id: collapsedId,
      title: '证据分支（折叠）',
      summary: `共 ${evidenceTexts.length} 条关键证据，可点击“展开证据分支”查看详情。`,
      raw: mergedSummary,
      category: 'evidence',
    });
    links.push({
      source: 'route',
      target: collapsedId,
      lineStyle: { type: 'dashed', opacity: 0.7 },
    });
    links.push({
      source: collapsedId,
      target: 'status',
      lineStyle: { type: 'dashed', opacity: 0.75 },
    });
  }

  return {
    option: {
      animationDurationUpdate: 240,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#102738',
        borderColor: '#2f4f68',
        textStyle: { color: '#f7fbff' },
      },
      series: [
        {
          type: 'graph',
          layout: 'none',
          roam: true,
          draggable: false,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 8,
          lineStyle: {
            color: '#7392ad',
            width: 2,
            opacity: 0.85,
          },
          data: nodes,
          links,
        },
      ],
      grid: { top: 0, left: 0, right: 0, bottom: 0 },
    },
    details,
    defaultSelectedId: details.conclusion
      ? 'conclusion'
      : details.status
        ? 'status'
        : null,
  };
}

export function buildFlowChartOption(
  input: BuildFlowChartOptionInput,
): Record<string, unknown> {
  const nodes = input.flowStages.map((stage) => {
    const runtime = input.stageRuntime[stage];
    const isRunning = runtime.status === 'running';
    return {
      id: stage,
      name: input.stageLabels[stage],
      x: FLOW_NODE_POSITIONS[stage][0],
      y: FLOW_NODE_POSITIONS[stage][1],
      symbolSize: isRunning ? 72 : stage === 'ESCALATION' ? 56 : 62,
      itemStyle: {
        color: stageColor(runtime.status),
        borderColor: '#102738',
        borderWidth: 1,
        shadowBlur: isRunning ? 18 : 0,
        shadowColor: isRunning ? 'rgba(14,141,143,0.45)' : 'transparent',
      },
      label: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 600,
      },
      tooltip: {
        formatter: `${input.stageLabels[stage]}<br/>${runtime.status}<br/>${runtime.message}`,
      },
    };
  });

  const links = [
    ['START', 'INFO_GATHER'],
    ['INFO_GATHER', 'RISK_ASSESS'],
    ['RISK_ASSESS', 'ROUTING'],
    ['ROUTING', 'DEBATE'],
    ['DEBATE', 'CONSENSUS'],
    ['CONSENSUS', 'REVIEW'],
    ['REVIEW', 'OUTPUT'],
    ['ROUTING', 'ESCALATION'],
    ['ESCALATION', 'OUTPUT'],
  ].map(([source, target]) => {
    const sourceStatus = input.stageRuntime[source as WorkflowStage].status;
    const targetStatus = input.stageRuntime[target as WorkflowStage].status;
    const active = sourceStatus !== 'pending' && targetStatus !== 'pending';
    const running = targetStatus === 'running';
    return {
      source,
      target,
      lineStyle: {
        color: running ? '#0e8d8f' : active ? '#2e9156' : '#7e92a8',
        width: running ? 4 : active ? 3 : 2,
        opacity: active ? 0.95 : 0.45,
        curveness: target === 'ESCALATION' || source === 'ESCALATION' ? 0.2 : 0,
      },
    };
  });

  return {
    animationDurationUpdate: 300,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#102738',
      borderColor: '#2f4f68',
      textStyle: { color: '#f7fbff' },
    },
    series: [
      {
        type: 'graph',
        layout: 'none',
        roam: true,
        draggable: false,
        data: nodes,
        links,
      },
    ],
    grid: { top: 0, left: 0, right: 0, bottom: 0 },
  };
}

export function buildReasoningMapModel(
  input: BuildReasoningMapModelInput,
): ConsultationReasoningMapModel {
  if (input.snapshot && input.snapshot.graph.nodes.length > 0) {
    const snapshotModel = buildSnapshotReasoningMapModel(input.snapshot);
    if (snapshotModel) {
      return snapshotModel;
    }
  }

  return buildFallbackReasoningMapModel(input.fallback);
}

