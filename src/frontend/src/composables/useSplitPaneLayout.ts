import { computed, ref, type Ref } from 'vue';

interface UseSplitPaneLayoutOptions {
  storageKey: string;
  minRatio?: number;
  maxRatio?: number;
  defaultRatio?: number;
}

function clampRatio(value: number, minRatio: number, maxRatio: number): number {
  return Math.max(minRatio, Math.min(maxRatio, value));
}

function readPersistedRatio(storageKey: string): number | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistRatio(storageKey: string, ratio: number): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, String(ratio));
  } catch {
    // Ignore persistence failures to keep drag behavior responsive.
  }
}

export interface SplitPaneLayoutState {
  layoutRef: Ref<HTMLElement | null>;
  leftRatio: Ref<number>;
  leftPaneStyle: Ref<{ width: string }>;
  startDragging: (event: MouseEvent) => void;
  handleDragging: (event: MouseEvent) => void;
  stopDragging: () => void;
}

export function useSplitPaneLayout(
  options: UseSplitPaneLayoutOptions,
): SplitPaneLayoutState {
  const minRatio = options.minRatio ?? 30;
  const maxRatio = options.maxRatio ?? 70;
  const defaultRatio = options.defaultRatio ?? 42;

  const initialRatio = (() => {
    const saved = readPersistedRatio(options.storageKey);
    if (saved === null) {
      return clampRatio(defaultRatio, minRatio, maxRatio);
    }
    return clampRatio(saved, minRatio, maxRatio);
  })();

  const layoutRef = ref<HTMLElement | null>(null);
  const leftRatio = ref<number>(initialRatio);
  const dragging = ref<boolean>(false);

  const leftPaneStyle = computed<{ width: string }>(() => {
    return { width: `${leftRatio.value}%` };
  });

  function startDragging(event: MouseEvent): void {
    event.preventDefault();
    dragging.value = true;
  }

  function handleDragging(event: MouseEvent): void {
    if (!dragging.value || !layoutRef.value) {
      return;
    }

    const rect = layoutRef.value.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const ratio = ((event.clientX - rect.left) / rect.width) * 100;
    const clamped = clampRatio(ratio, minRatio, maxRatio);
    leftRatio.value = clamped;
    persistRatio(options.storageKey, clamped);
  }

  function stopDragging(): void {
    dragging.value = false;
  }

  return {
    layoutRef,
    leftRatio,
    leftPaneStyle,
    startDragging,
    handleDragging,
    stopDragging,
  };
}
