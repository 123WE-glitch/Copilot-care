interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceReport {
  sessionId: string;
  timestamp: string;
  metrics: PerformanceMetric[];
  navigationTiming?: NavigationTiming;
  resourceTiming?: ResourceTiming[];
}

interface NavigationTiming {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
}

interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
}

function getTransferSize(entry: PerformanceResourceTiming): number {
  return typeof entry.transferSize === 'number'
    ? entry.transferSize
    : 0;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private sessionId: string;
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  startTimer(name: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  endTimer(name: string): number | undefined {
    if (!this.enabled) return undefined;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`PerformanceMonitor: Timer "${name}" was not started`);
      return undefined;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    return metric.duration;
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  getNavigationTiming(): NavigationTiming | undefined {
    if (!this.enabled || typeof window === 'undefined') return undefined;

    const navTiming = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!navTiming) return undefined;

    return {
      domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
      loadComplete: navTiming.loadEventEnd - navTiming.loadEventStart,
      firstPaint: (window.performance.getEntriesByType('paint')[0] as PerformancePaintTiming | undefined)?.startTime ?? 0,
      firstContentfulPaint: (window.performance.getEntriesByType('paint')[1] as PerformancePaintTiming | undefined)?.startTime ?? 0,
    };
  }

  getResourceTiming(): ResourceTiming[] {
    if (!this.enabled || typeof window === 'undefined') return [];

    const entries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return entries.slice(-10).map((entry) => ({
      name: entry.name.split('/').pop() ?? entry.name,
      duration: entry.duration,
      size: getTransferSize(entry),
      type: entry.initiatorType,
    }));
  }

  generateReport(): PerformanceReport {
    return {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      navigationTiming: this.getNavigationTiming(),
      resourceTiming: this.getResourceTiming(),
    };
  }

  logReport(): void {
    const report = this.generateReport();
    console.group('Performance Report');
    console.log('Session:', report.sessionId);
    console.log('Timestamp:', report.timestamp);
    
    if (report.navigationTiming) {
      console.log('Navigation Timing:');
      console.log(`  DOM Content Loaded: ${report.navigationTiming.domContentLoaded.toFixed(2)}ms`);
      console.log(`  Load Complete: ${report.navigationTiming.loadComplete.toFixed(2)}ms`);
      console.log(`  First Paint: ${report.navigationTiming.firstPaint.toFixed(2)}ms`);
      console.log(`  First Contentful Paint: ${report.navigationTiming.firstContentfulPaint.toFixed(2)}ms`);
    }

    if (report.metrics.length > 0) {
      console.log('Custom Metrics:');
      report.metrics.forEach((m) => {
        console.log(`  ${m.name}: ${m.duration?.toFixed(2)}ms`);
      });
    }

    if (report.resourceTiming && report.resourceTiming.length > 0) {
      console.log('Top Resources:');
      report.resourceTiming.slice(0, 5).forEach((r) => {
        console.log(`  ${r.name}: ${r.duration.toFixed(2)}ms (${(r.size / 1024).toFixed(2)}KB)`);
      });
    }

    console.groupEnd();
  }

  clear(): void {
    this.metrics.clear();
    this.sessionId = this.generateSessionId();
  }
}

export const perfMonitor = new PerformanceMonitor(import.meta.env.DEV);

export function createTimer(name: string, metadata?: Record<string, unknown>) {
  return {
    start: () => perfMonitor.startTimer(name, metadata),
    end: () => perfMonitor.endTimer(name),
  };
}

export type { PerformanceMetric, PerformanceReport, NavigationTiming, ResourceTiming };
