import type { EChartsCoreOption } from 'echarts/core';
import { resolveCopilotChartTheme } from '../chart/theme';
import type { PatientVitalsRecord } from './model';

function formatAxisLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function buildVitalsChartOption(
  records: PatientVitalsRecord[],
): EChartsCoreOption {
  const chartTheme = resolveCopilotChartTheme();
  const timeline = records.map((record) => formatAxisLabel(record.timestamp));

  return {
    color: [
      chartTheme.vitalsSeries.systolic,
      chartTheme.vitalsSeries.diastolic,
      chartTheme.vitalsSeries.heartRate,
    ],
    tooltip: {
      trigger: 'axis',
      backgroundColor: chartTheme.tooltipBackground,
      borderColor: chartTheme.tooltipBorder,
      textStyle: {
        color: chartTheme.tooltipText,
      },
    },
    legend: {
      data: ['收缩压', '舒张压', '心率'],
      bottom: 0,
      textStyle: {
        color: chartTheme.textSecondary,
      },
    },
    grid: {
      top: 24,
      left: 52,
      right: 48,
      bottom: 56,
    },
    xAxis: {
      type: 'category',
      data: timeline,
      axisLine: {
        lineStyle: {
          color: chartTheme.border,
        },
      },
      axisTick: {
        lineStyle: {
          color: chartTheme.borderSoft,
        },
      },
      axisLabel: {
        color: chartTheme.textSecondary,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '血压 (mmHg)',
        min: 50,
        max: 200,
        nameTextStyle: {
          color: chartTheme.textSecondary,
        },
        axisLine: {
          lineStyle: {
            color: chartTheme.border,
          },
        },
        axisLabel: {
          color: chartTheme.textSecondary,
        },
        splitLine: {
          lineStyle: {
            color: chartTheme.borderSoft,
            opacity: 0.55,
          },
        },
      },
      {
        type: 'value',
        name: '心率 (bpm)',
        min: 40,
        max: 140,
        nameTextStyle: {
          color: chartTheme.textSecondary,
        },
        axisLine: {
          lineStyle: {
            color: chartTheme.border,
          },
        },
        axisLabel: {
          color: chartTheme.textSecondary,
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: '收缩压',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: chartTheme.vitalsSeries.systolic,
        },
        itemStyle: {
          color: chartTheme.vitalsSeries.systolic,
        },
        data: records.map((record) => record.systolicBP ?? null),
      },
      {
        name: '舒张压',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: chartTheme.vitalsSeries.diastolic,
        },
        itemStyle: {
          color: chartTheme.vitalsSeries.diastolic,
        },
        data: records.map((record) => record.diastolicBP ?? null),
      },
      {
        name: '心率',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        yAxisIndex: 1,
        lineStyle: {
          width: 2,
          color: chartTheme.vitalsSeries.heartRate,
        },
        itemStyle: {
          color: chartTheme.vitalsSeries.heartRate,
        },
        data: records.map((record) => record.heartRate ?? null),
      },
    ],
  };
}