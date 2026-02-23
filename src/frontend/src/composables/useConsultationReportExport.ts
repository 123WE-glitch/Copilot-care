import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { ReportData } from '../services/reportExport';

interface UseConsultationReportExportOptions {
  hasExportableContent: () => boolean;
  buildReportData: () => ReportData;
}

type ReportExportModule = typeof import('../services/reportExport');

export interface ConsultationReportExportState {
  exportingReport: Ref<boolean>;
  reportExportError: Ref<string>;
  reportExportSuccess: Ref<string>;
  canExportReport: ComputedRef<boolean>;
  prefetchReportExporter: () => Promise<void>;
  handleExportReport: () => Promise<void>;
}

export function useConsultationReportExport(
  options: UseConsultationReportExportOptions,
): ConsultationReportExportState {
  const exportingReport = ref(false);
  const reportExportError = ref('');
  const reportExportSuccess = ref('');
  let reportExportModulePromise: Promise<ReportExportModule> | null = null;

  const canExportReport = computed<boolean>(() => {
    return !exportingReport.value && options.hasExportableContent();
  });

  function loadReportExportModule(): Promise<ReportExportModule> {
    if (!reportExportModulePromise) {
      reportExportModulePromise = import('../services/reportExport');
    }
    return reportExportModulePromise;
  }

  async function prefetchReportExporter(): Promise<void> {
    if (!options.hasExportableContent()) {
      return;
    }

    try {
      await loadReportExportModule();
    } catch {
      // Ignore warm-up failures and defer actionable feedback to click handler.
    }
  }

  async function handleExportReport(): Promise<void> {
    if (exportingReport.value) {
      return;
    }

    if (!options.hasExportableContent()) {
      reportExportError.value = '暂无可导出的内容，请先完成一次会诊。';
      reportExportSuccess.value = '';
      return;
    }

    reportExportError.value = '';
    reportExportSuccess.value = '';
    exportingReport.value = true;

    try {
      const { exportConsultationReport } = await loadReportExportModule();
      const outcome = await exportConsultationReport(options.buildReportData());

      reportExportSuccess.value = outcome.format === 'pdf'
        ? '报告导出成功（PDF）。'
        : 'PDF导出失败，已自动导出文本报告（UTF-8）。';
    } catch (error) {
      reportExportError.value = error instanceof Error
        ? `报告导出失败：${error.message}`
        : '报告导出失败，请稍后重试。';
    } finally {
      exportingReport.value = false;
    }
  }

  return {
    exportingReport,
    reportExportError,
    reportExportSuccess,
    canExportReport,
    prefetchReportExporter,
    handleExportReport,
  };
}

