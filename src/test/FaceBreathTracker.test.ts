// ============================================================
// MIST — FaceBreathTracker Multimodal Engine Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FaceBreathTracker } from '../engine/FaceBreathTracker';
import type { BreathState } from '../types';

describe('FaceBreathTracker', () => {
  let callback: ReturnType<typeof vi.fn<(state: BreathState) => void>>;
  let tracker: FaceBreathTracker;

  beforeEach(() => {
    callback = vi.fn((_state: BreathState) => {});
    tracker = new FaceBreathTracker(callback);
  });

  it('initializes with default combined breath mode and idle state', () => {
    expect(tracker.mode).toBe('combined');
    expect(tracker.state).toMatchObject({
      isSupported: true,
      isActive: false,
      isBlowing: false,
      intensity: 0,
      micIntensity: 0,
      mouthOpenness: 0,
      isMouthOpen: false,
      mouthPosition: null,
      mode: 'combined',
    });
  });

  it('allows changing breath mode and triggers state update', () => {
    tracker.setMode('mouth');
    expect(tracker.mode).toBe('mouth');
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'mouth' })
    );

    tracker.setMode('mic');
    expect(tracker.mode).toBe('mic');
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'mic' })
    );

    tracker.setMode('combined');
    expect(tracker.mode).toBe('combined');
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'combined' })
    );
  });

  it('manual blowing sets blowing flag and intensity correctly', () => {
    tracker.setManualBlowing(true, 0.85);

    expect(tracker.state.isBlowing).toBe(true);
    expect(tracker.state.intensity).toBeCloseTo(0.85);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        isBlowing: true,
        intensity: 0.85,
      })
    );

    tracker.setManualBlowing(false);
    expect(tracker.state.isBlowing).toBe(false);
    expect(tracker.state.intensity).toBe(0);
  });

  it('stop resets active state and clears position and intensity', () => {
    tracker.setManualBlowing(true, 0.7);
    tracker.stop();

    expect(tracker.state.isActive).toBe(false);
    expect(tracker.state.isBlowing).toBe(false);
    expect(tracker.state.intensity).toBe(0);
    expect(tracker.state.mouthPosition).toBeNull();
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        isBlowing: false,
        intensity: 0,
      })
    );
  });

  it('handles MediaPipe initialization failure gracefully', async () => {
    vi.doMock('@mediapipe/tasks-vision', () => ({
      FilesetResolver: {
        forVisionTasks: vi.fn().mockRejectedValue(new Error('Wasm load error')),
      },
      FaceLandmarker: {
        createFromOptions: vi.fn(),
      },
    }));

    const success = await tracker.initialize();
    expect(success).toBe(false);
  });
});
