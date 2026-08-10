// Lightweight Core Web Vitals collection using the PerformanceObserver API.
// No external dependency. When VITE_WEB_VITALS_ENDPOINT is set, metrics are
// POSTed there (JSON) using the `sendBeacon` API so the page doesn't block on
// delivery. Leave the env var unset in production to disable collection.

type MetricName = 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
type Metric = { name: MetricName; value: number; id: string };

const ENDPOINT = (import.meta.env.VITE_WEB_VITALS_ENDPOINT as string | undefined) || '';

const send = (metric: Metric) => {
  try {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      page: window.location.pathname,
      href: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    });
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* Web Vitals collection must never throw */
  }
};

const round = (n: number) => Math.round(n * 1000) / 1000;

const on = (name: MetricName, entry: PerformanceEntry) => {
  send({ name, value: round(entry.startTime || 0), id: name });
};

export function reportWebVitals(): void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined' || !ENDPOINT) return;

  try {
    // First Contentful Paint
    const fcp = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') on('FCP', entry);
      }
    });
    fcp.observe({ type: 'paint', buffered: true });

    // Largest Contentful Paint
    const lcp = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      on('LCP', entries[entries.length - 1]);
    });
    lcp.observe({ type: 'largest-contentful-paint', buffered: true });

    // Cumulative Layout Shift
    let clsValue = 0;
    const cls = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as unknown as { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput && typeof shift.value === 'number') clsValue += shift.value;
      }
    });
    cls.observe({ type: 'layout-shift', buffered: true });

    // Interaction to Next Paint (Chrome 111+)
    const inp = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as unknown as { duration?: number };
      if (last && typeof last.duration === 'number') {
        send({ name: 'INP', value: round(last.duration), id: 'inp' });
      }
    });
    inp.observe({ type: 'event', durationThreshold: 40, buffered: true } as PerformanceObserverInit);

    // Time to First Byte
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav && typeof nav.responseStart === 'number') {
      send({ name: 'TTFB', value: round(nav.responseStart), id: 'ttfb' });
    }

    // Flush CLS on pagehide (values are only final once the page is left)
    const flushCls = () => {
      if (clsValue > 0) send({ name: 'CLS', value: round(clsValue), id: 'cls' });
    };
    window.addEventListener('pagehide', flushCls, { once: true });
  } catch {
    /* Older browsers without PerformanceObserver — skip */
  }
}
