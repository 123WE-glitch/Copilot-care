export interface CopilotChartTheme {
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  border: string;
  borderSoft: string;
  surface: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  flow: {
    running: string;
    done: string;
    blocked: string;
    skipped: string;
    pending: string;
    linkDefault: string;
    linkInactive: string;
  };
  graphNode: {
    input: string;
    stage: string;
    decision: string;
    evidence: string;
    risk: string;
    output: string;
    agent: string;
    fallback: string;
  };
  vitalsSeries: {
    systolic: string;
    diastolic: string;
    heartRate: string;
  };
}

const FALLBACK_CHART_THEME: CopilotChartTheme = {
  textPrimary: '#122638',
  textSecondary: '#334b61',
  textInverse: '#f7fbff',
  border: '#c9d8e7',
  borderSoft: '#dbe7f2',
  surface: '#ffffff',
  tooltipBackground: '#102738',
  tooltipBorder: '#2f4f68',
  tooltipText: '#f7fbff',
  flow: {
    running: '#0e8d8f',
    done: '#2e9156',
    blocked: '#c3472a',
    skipped: '#bf8c1f',
    pending: '#9aa8b8',
    linkDefault: '#7392ad',
    linkInactive: '#7e92a8',
  },
  graphNode: {
    input: '#406c9d',
    stage: '#1f7b80',
    decision: '#2a6f93',
    evidence: '#2e9156',
    risk: '#bf8c1f',
    output: '#276566',
    agent: '#5d6f8d',
    fallback: '#6b7f96',
  },
  vitalsSeries: {
    systolic: '#0e8d8f',
    diastolic: '#2a6f93',
    heartRate: '#bf8c1f',
  },
};

function getCssValue(
  styles: CSSStyleDeclaration | null,
  name: string,
  fallback: string,
): string {
  if (!styles) {
    return fallback;
  }
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

function resolveCssStyles(): CSSStyleDeclaration | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  return window.getComputedStyle(document.documentElement);
}

export function resolveCopilotChartTheme(): CopilotChartTheme {
  const styles = resolveCssStyles();

  return {
    textPrimary: getCssValue(
      styles,
      '--color-text-primary',
      FALLBACK_CHART_THEME.textPrimary,
    ),
    textSecondary: getCssValue(
      styles,
      '--color-text-secondary',
      FALLBACK_CHART_THEME.textSecondary,
    ),
    textInverse: getCssValue(
      styles,
      '--cc-text-inverse',
      FALLBACK_CHART_THEME.textInverse,
    ),
    border: getCssValue(styles, '--color-border', FALLBACK_CHART_THEME.border),
    borderSoft: getCssValue(
      styles,
      '--color-border-light',
      FALLBACK_CHART_THEME.borderSoft,
    ),
    surface: getCssValue(styles, '--color-bg-primary', FALLBACK_CHART_THEME.surface),
    tooltipBackground: getCssValue(
      styles,
      '--color-chart-tooltip-bg',
      FALLBACK_CHART_THEME.tooltipBackground,
    ),
    tooltipBorder: getCssValue(
      styles,
      '--color-chart-tooltip-border',
      FALLBACK_CHART_THEME.tooltipBorder,
    ),
    tooltipText: getCssValue(
      styles,
      '--color-chart-tooltip-text',
      FALLBACK_CHART_THEME.tooltipText,
    ),
    flow: {
      running: getCssValue(
        styles,
        '--cc-accent-teal-500',
        FALLBACK_CHART_THEME.flow.running,
      ),
      done: getCssValue(styles, '--color-success', FALLBACK_CHART_THEME.flow.done),
      blocked: getCssValue(styles, '--color-danger', FALLBACK_CHART_THEME.flow.blocked),
      skipped: getCssValue(
        styles,
        '--color-warning',
        FALLBACK_CHART_THEME.flow.skipped,
      ),
      pending: getCssValue(
        styles,
        '--color-text-muted',
        FALLBACK_CHART_THEME.flow.pending,
      ),
      linkDefault: getCssValue(
        styles,
        '--color-info',
        FALLBACK_CHART_THEME.flow.linkDefault,
      ),
      linkInactive: getCssValue(
        styles,
        '--color-border-interactive',
        FALLBACK_CHART_THEME.flow.linkInactive,
      ),
    },
    graphNode: {
      input: getCssValue(
        styles,
        '--color-info',
        FALLBACK_CHART_THEME.graphNode.input,
      ),
      stage: getCssValue(
        styles,
        '--cc-accent-teal-500',
        FALLBACK_CHART_THEME.graphNode.stage,
      ),
      decision: getCssValue(
        styles,
        '--cc-accent-cyan-500',
        FALLBACK_CHART_THEME.graphNode.decision,
      ),
      evidence: getCssValue(
        styles,
        '--color-success',
        FALLBACK_CHART_THEME.graphNode.evidence,
      ),
      risk: getCssValue(
        styles,
        '--color-warning',
        FALLBACK_CHART_THEME.graphNode.risk,
      ),
      output: getCssValue(
        styles,
        '--cc-accent-teal-600',
        FALLBACK_CHART_THEME.graphNode.output,
      ),
      agent: getCssValue(
        styles,
        '--cc-accent-violet-500',
        FALLBACK_CHART_THEME.graphNode.agent,
      ),
      fallback: getCssValue(
        styles,
        '--color-text-muted',
        FALLBACK_CHART_THEME.graphNode.fallback,
      ),
    },
    vitalsSeries: {
      systolic: getCssValue(
        styles,
        '--cc-accent-teal-500',
        FALLBACK_CHART_THEME.vitalsSeries.systolic,
      ),
      diastolic: getCssValue(
        styles,
        '--color-info',
        FALLBACK_CHART_THEME.vitalsSeries.diastolic,
      ),
      heartRate: getCssValue(
        styles,
        '--color-warning',
        FALLBACK_CHART_THEME.vitalsSeries.heartRate,
      ),
    },
  };
}
