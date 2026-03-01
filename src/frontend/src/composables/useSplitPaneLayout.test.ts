import { describe, expect, it } from 'vitest';
import { useSplitPaneLayout } from './useSplitPaneLayout';

function createLayoutHost(width: number): HTMLElement {
  const element = document.createElement('div');
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      left: 0,
      top: 0,
      right: width,
      bottom: 100,
      width,
      height: 100,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    }),
  });
  return element;
}

describe('useSplitPaneLayout', () => {
  it('uses default ratio when localStorage is empty', () => {
    window.localStorage.clear();

    const state = useSplitPaneLayout({
      storageKey: 'split-empty',
      defaultRatio: 40,
      minRatio: 30,
      maxRatio: 70,
    });

    expect(state.leftRatio.value).toBe(40);
    expect(state.leftPaneStyle.value.width).toBe('40%');
  });

  it('loads persisted ratio and clamps to boundaries', () => {
    window.localStorage.setItem('split-clamp-high', '98');
    const high = useSplitPaneLayout({
      storageKey: 'split-clamp-high',
      minRatio: 30,
      maxRatio: 70,
    });
    expect(high.leftRatio.value).toBe(70);

    window.localStorage.setItem('split-clamp-low', '20');
    const low = useSplitPaneLayout({
      storageKey: 'split-clamp-low',
      minRatio: 30,
      maxRatio: 70,
    });
    expect(low.leftRatio.value).toBe(30);
  });

  it('updates ratio while dragging and persists latest value', () => {
    window.localStorage.clear();

    const state = useSplitPaneLayout({
      storageKey: 'split-drag',
      minRatio: 30,
      maxRatio: 70,
      defaultRatio: 42,
    });

    state.layoutRef.value = createLayoutHost(1000);
    state.startDragging(new MouseEvent('mousedown', { clientX: 200 }));
    state.handleDragging(new MouseEvent('mousemove', { clientX: 650 }));
    state.stopDragging();

    expect(state.leftRatio.value).toBe(65);
    expect(window.localStorage.getItem('split-drag')).toBe('65');
    expect(state.leftPaneStyle.value.width).toBe('65%');
  });

  it('nudges ratio and resets to default ratio', () => {
    window.localStorage.clear();

    const state = useSplitPaneLayout({
      storageKey: 'split-nudge',
      minRatio: 30,
      maxRatio: 70,
      defaultRatio: 44,
    });

    state.nudgeRatio(5);
    expect(state.leftRatio.value).toBe(49);
    expect(window.localStorage.getItem('split-nudge')).toBe('49');

    state.resetRatio();
    expect(state.leftRatio.value).toBe(44);
    expect(window.localStorage.getItem('split-nudge')).toBe('44');
  });

  it('ignores move events when not dragging', () => {
    window.localStorage.clear();

    const state = useSplitPaneLayout({
      storageKey: 'split-idle',
      defaultRatio: 42,
    });

    state.layoutRef.value = createLayoutHost(1000);
    state.handleDragging(new MouseEvent('mousemove', { clientX: 900 }));

    expect(state.leftRatio.value).toBe(42);
    expect(window.localStorage.getItem('split-idle')).toBeNull();
  });
});
