import { ref, type Ref } from 'vue';
import type {
  ExplainableReport,
  OrchestrationSnapshot,
  TriageRoutingInfo,
} from '@copilot-care/shared/types';
import { ROUTE_MODE_TO_COLLABORATION } from '../constants/triageLabels';
import {
  buildReasoningMapModel,
  type ConsultationReasoningKind,
  type ConsultationReasoningMapNodeDetail,
} from './useConsultationCharts';

interface RoutingPreviewState {
  routeMode?: string;
  department?: string;
  collaborationMode?: string;
  complexityScore?: number;
}

interface ReasoningMapItem {
  kind: ConsultationReasoningKind;
  text: string;
}

interface ChartLike {
  setOption: (option: unknown, notMerge?: boolean) => void;
}

interface UseConsultationReasoningMapOptions {
  reasoningMapChart: Ref<ChartLike | null>;
  formSymptomText: Readonly<Ref<string>>;
  routeInfo: Ref<TriageRoutingInfo | null>;
  routingPreview: Ref<RoutingPreviewState>;
  status: Readonly<Ref<string>>;
  statusLabels: Record<string, string>;
  explainableReport: Ref<ExplainableReport | null>;
  typedOutput: Ref<string>;
  orchestrationSnapshot: Ref<OrchestrationSnapshot | null>;
  reasoningItems: Readonly<Ref<ReasoningMapItem[]>>;
  reasoningKindLabels: Record<ConsultationReasoningKind, string>;
  routeModeLabels: Record<string, string>;
  departmentLabels: Record<string, string>;
  collaborationLabels: Record<string, string>;
}

export interface UseConsultationReasoningMapState {
  showEvidenceBranches: Ref<boolean>;
  selectedReasoningNode: Ref<ConsultationReasoningMapNodeDetail | null>;
  toggleEvidenceBranches: () => void;
  renderReasoningMap: () => void;
  handleReasoningMapNodeClick: (nodeId: string) => void;
  resetReasoningMapSelection: () => void;
}

export function useConsultationReasoningMap(
  options: UseConsultationReasoningMapOptions,
): UseConsultationReasoningMapState {
  const showEvidenceBranches = ref<boolean>(true);
  const selectedReasoningNode = ref<ConsultationReasoningMapNodeDetail | null>(
    null,
  );
  const reasoningNodeLookup = ref<Record<string, ConsultationReasoningMapNodeDetail>>(
    {},
  );

  function renderReasoningMap(): void {
    const chart = options.reasoningMapChart.value;
    if (!chart) {
      return;
    }

    const symptomText = options.formSymptomText.value.trim() || '当前需求';
    const department =
      options.routeInfo.value?.department ?? options.routingPreview.value.department;
    const routeMode =
      options.routeInfo.value?.routeMode ?? options.routingPreview.value.routeMode;
    const collaboration =
      options.routeInfo.value?.collaborationMode
      ?? options.routingPreview.value.collaborationMode
      ?? (routeMode ? ROUTE_MODE_TO_COLLABORATION[routeMode] : undefined);

    const statusValue = options.status.value;
    const statusLabel = options.statusLabels[statusValue] ?? statusValue;
    const conclusionText =
      options.explainableReport.value?.conclusion
      || options.typedOutput.value.trim()
      || '等待结论输出';

    const mapModel = buildReasoningMapModel({
      snapshot: options.orchestrationSnapshot.value,
      fallback: {
        symptomText,
        department,
        routeMode,
        collaboration,
        statusValue,
        statusLabel,
        conclusionText,
        typedOutput: options.typedOutput.value,
        reasoningItems: options.reasoningItems.value.map((item) => ({
          kind: item.kind,
          text: item.text,
        })),
        showEvidenceBranches: showEvidenceBranches.value,
        reasoningKindLabels: options.reasoningKindLabels,
        routeModeLabels: options.routeModeLabels,
        departmentLabels: options.departmentLabels,
        collaborationLabels: options.collaborationLabels,
      },
    });

    chart.setOption(mapModel.option, true);
    reasoningNodeLookup.value = mapModel.details;

    const currentSelectedId = selectedReasoningNode.value?.id;
    if (currentSelectedId && reasoningNodeLookup.value[currentSelectedId]) {
      selectedReasoningNode.value = reasoningNodeLookup.value[currentSelectedId];
      return;
    }

    selectedReasoningNode.value = mapModel.defaultSelectedId
      ? reasoningNodeLookup.value[mapModel.defaultSelectedId] ?? null
      : null;
  }

  function handleReasoningMapNodeClick(nodeId: string): void {
    const detail = reasoningNodeLookup.value[nodeId];
    if (detail) {
      selectedReasoningNode.value = detail;
    }
  }

  function toggleEvidenceBranches(): void {
    showEvidenceBranches.value = !showEvidenceBranches.value;
    renderReasoningMap();
  }

  function resetReasoningMapSelection(): void {
    selectedReasoningNode.value = null;
    reasoningNodeLookup.value = {};
  }

  return {
    showEvidenceBranches,
    selectedReasoningNode,
    toggleEvidenceBranches,
    renderReasoningMap,
    handleReasoningMapNodeClick,
    resetReasoningMapSelection,
  };
}
