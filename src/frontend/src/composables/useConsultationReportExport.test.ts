import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReportData } from '../services/reportExport';
import { useConsultationReportExport } from './useConsultationReportExport';

const { exportConsultationReportMock } = vi.hoisted(() => ({
  exportConsultationReportMock: vi.fn(),
}));

vi.mock('../services/reportExport', async () => {
  const actual = await vi.importActual('../services/reportExport');
  return {
    ...actual,
    exportConsultationReport: exportConsultationReportMock,
  };
});

function createReportData(): ReportData {
  return {
    patientProfile: {
      patientId: 'demo-1',
      age: 40,
      sex: 'male',
      chiefComplaint: '头晕',
      symptoms: ['头晕'],
      chronicDiseases: [],
      medicationHistory: [],
      allergyHistory: [],
      lifestyleTags: [],
    },
    triageResult: null,
    routing: null,
    explainableReport: null,
    conclusion: '建议复诊',
    actions: [],
    evidence: [],
    notes: [],
  };
}

describe('useConsultationReportExport', () => {
  beforeEach(() => {
    exportConsultationReportMock.mockReset();
  });

  it('exports pdf report on happy path', async () => {
    const data = createReportData();
    exportConsultationReportMock.mockResolvedValue({
      format: 'pdf',
      fileName: 'consultation-report-2026-02-23.pdf',
    });

    const state = useConsultationReportExport({
      hasExportableContent: () => true,
      buildReportData: () => data,
    });

    await state.handleExportReport();

    expect(exportConsultationReportMock).toHaveBeenCalledTimes(1);
    expect(exportConsultationReportMock).toHaveBeenCalledWith(data);
    expect(state.reportExportError.value).toBe('');
    expect(state.reportExportSuccess.value).toContain('PDF');
    expect(state.exportingReport.value).toBe(false);
    expect(state.canExportReport.value).toBe(true);
  });

  it('returns validation message when no exportable content', async () => {
    const state = useConsultationReportExport({
      hasExportableContent: () => false,
      buildReportData: () => createReportData(),
    });

    await state.handleExportReport();

    expect(exportConsultationReportMock).not.toHaveBeenCalled();
    expect(state.reportExportError.value).toContain('暂无可导出的内容');
    expect(state.reportExportSuccess.value).toBe('');
    expect(state.exportingReport.value).toBe(false);
    expect(state.canExportReport.value).toBe(false);
  });

  it('prefetches exporter module before click and reuses it on export', async () => {
    const data = createReportData();
    exportConsultationReportMock.mockResolvedValue({
      format: 'pdf',
      fileName: 'consultation-report-2026-02-23.pdf',
    });

    const state = useConsultationReportExport({
      hasExportableContent: () => true,
      buildReportData: () => data,
    });

    await state.prefetchReportExporter();

    expect(exportConsultationReportMock).not.toHaveBeenCalled();
    expect(state.reportExportError.value).toBe('');
    expect(state.reportExportSuccess.value).toBe('');

    await state.handleExportReport();

    expect(exportConsultationReportMock).toHaveBeenCalledTimes(1);
    expect(exportConsultationReportMock).toHaveBeenCalledWith(data);
  });

  it('skips prefetch when no exportable content is available', async () => {
    const state = useConsultationReportExport({
      hasExportableContent: () => false,
      buildReportData: () => createReportData(),
    });

    await state.prefetchReportExporter();

    expect(exportConsultationReportMock).not.toHaveBeenCalled();
  });

  it('shows fallback success message when txt fallback is returned', async () => {
    exportConsultationReportMock.mockResolvedValue({
      format: 'txt',
      fileName: 'consultation-report-2026-02-23.txt',
    });

    const state = useConsultationReportExport({
      hasExportableContent: () => true,
      buildReportData: () => createReportData(),
    });

    await state.handleExportReport();

    expect(state.reportExportError.value).toBe('');
    expect(state.reportExportSuccess.value).toContain('UTF-8');
  });

  it('converts thrown error into user-friendly message', async () => {
    exportConsultationReportMock.mockRejectedValue(new Error('network timeout'));

    const state = useConsultationReportExport({
      hasExportableContent: () => true,
      buildReportData: () => createReportData(),
    });

    await state.handleExportReport();

    expect(state.reportExportSuccess.value).toBe('');
    expect(state.reportExportError.value).toContain('network timeout');
    expect(state.exportingReport.value).toBe(false);
  });
});
