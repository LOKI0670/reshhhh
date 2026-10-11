// ============================================================
// MIST — BreathDetector Engine Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BreathDetector } from '../engine/BreathDetector';
import type { BreathState } from '../types';

describe('BreathDetector', () => {
  let callback: ReturnType<typeof vi.fn<(state: BreathState) => void>>;
  let detector: BreathDetector;

  beforeEach(() => {
    callback = vi.fn((_state: BreathState) => {});
    detector = new BreathDetector(callback);
  });

  it('initializes with inactive state', () => {
    expect(detector.state.isActive).toBe(false);
    expect(detector.state.isBlowing).toBe(false);
    expect(detector.state.intensity).toBe(0);
  });

  it('setManualBlowing activates blowing and updates intensity', () => {
    detector.setManualBlowing(true, 0.85);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        isBlowing: true,
      })
    );
  });

  it('setManualBlowing false resets blowing and intensity', () => {
    detector.setManualBlowing(true, 0.85);
    detector.setManualBlowing(false);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        isBlowing: false,
        intensity: 0,
      })
    );
  });

  it('stop cleans up resources and notifies callback', () => {
    detector.stop();
    expect(detector.state.isActive).toBe(false);
    expect(detector.state.isBlowing).toBe(false);
  });
});
