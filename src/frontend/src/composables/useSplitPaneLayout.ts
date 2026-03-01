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
  isDragging: Ref<boolean>;
  leftPaneStyle: Ref<{ width: string }>;
  startDragging: (event: MouseEvent | PointerEvent) => void;
  handleDragging: (event: MouseEvent | PointerEvent) => void;
  stopDragging: () => void;
  nudgeRatio: (delta: number) => void;
  resetRatio: () => void;
}

export function useSplitPaneLayout(
  options: UseSplitPaneLayoutOptions,
): SplitPaneLayoutState {
  const minRatio = options.minRatio ?? 30;
  const maxRatio = options.maxRatio ?? 70;
  const defaultRatio = clampRatio(options.defaultRatio ?? 42, minRatio, maxRatio);

  const initialRatio = (() => {
    const saved = readPersistedRatio(options.storageKey);
    if (saved === null) {
      return defaultRatio;
    }
    return clampRatio(saved, minRatio, maxRatio);
  })();

  const layoutRef = ref<HTMLElement | null>(null);
  const leftRatio = ref<number>(initialRatio);
  const dragging = ref<boolean>(false);

  const leftPaneStyle = computed<{ width: string }>(() => {
    return { width: `${leftRatio.value}%` };
  });

  function setLeftRatio(nextRatio: number): void {
    const clamped = clampRatio(nextRatio, minRatio, maxRatio);
    if (clamped === leftRatio.value) {
      return;
    }
    leftRatio.value = clamped;
    persistRatio(options.storageKey, clamped);
  }

  function startDragging(event: MouseEvent | PointerEvent): void {
    event.preventDefault();
    dragging.value = true;
    handleDragging(event);
  }

  function handleDragging(event: MouseEvent | PointerEvent): void {
    if (!dragging.value || !layoutRef.value) {
      return;
    }

    const rect = layoutRef.value.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const ratio = ((event.clientX - rect.left) / rect.width) * 100;
    setLeftRatio(ratio);
  }

  function stopDragging(): void {
    dragging.value = false;
  }

  function nudgeRatio(delta: number): void {
    setLeftRatio(leftRatio.value + delta);
  }

  function resetRatio(): void {
    setLeftRatio(defaultRatio);
  }

  return {
    layoutRef,
    leftRatio,
    isDragging: dragging,
    leftPaneStyle,
    startDragging,
    handleDragging,
    stopDragging,
    nudgeRatio,
    resetRatio,
  };
}
