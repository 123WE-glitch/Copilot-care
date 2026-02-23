import type { EChartsCoreOption } from 'echarts/core';
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
  const timeline = records.map((record) => formatAxisLabel(record.timestamp));

  return {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['收缩压', '舒张压', '心率'],
      bottom: 0,
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
    },
    yAxis: [
      {
        type: 'value',
        name: '血压 (mmHg)',
        min: 50,
        max: 200,
      },
      {
        type: 'value',
        name: '心率 (bpm)',
        min: 40,
        max: 140,
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
        lineStyle: { width: 2 },
        data: records.map((record) => record.systolicBP ?? null),
      },
      {
        name: '舒张压',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 2 },
        data: records.map((record) => record.diastolicBP ?? null),
      },
      {
        name: '心率',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        yAxisIndex: 1,
        lineStyle: { width: 2 },
        data: records.map((record) => record.heartRate ?? null),
      },
    ],
  };
}
