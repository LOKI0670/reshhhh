// ============================================================
// MIST — HandTracking Engine Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HandTracking } from '../engine/HandTracking';
import type { HandTrackingState } from '../types';

describe('HandTracking', () => {
  let callback: ReturnType<typeof vi.fn<(state: HandTrackingState) => void>>;
  let tracker: HandTracking;

  beforeEach(() => {
    callback = vi.fn((_state: HandTrackingState) => {});
    tracker = new HandTracking(callback);
  });

  it('initializes in idle state', () => {
    expect(tracker.status).toBe('idle');
    expect(tracker.available).toBe(false);
  });

  it('updateCanvasSize updates dimensions without throwing', () => {
    expect(() => tracker.updateCanvasSize(1280, 720)).not.toThrow();
  });

  it('stop resets active state and calls callback', () => {
    tracker.stop();
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        isAvailable: false,
        isActive: false,
        isHandDetected: false,
        isPinching: false,
        pinchStrength: 0,
        gesture: 'pinch',
        fingertipPosition: null,
        landmarks: null,
      })
    );
  });

  it('cleanup calls stop and sets status to idle', () => {
    tracker.cleanup();
    expect(tracker.status).toBe('idle');
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false })
    );
  });

  it('initializes successfully with mocked MediaPipe', async () => {
    vi.doMock('@mediapipe/tasks-vision', () => ({
      FilesetResolver: {
        forVisionTasks: vi.fn().mockResolvedValue({}),
      },
      HandLandmarker: {
        createFromOptions: vi.fn().mockResolvedValue({
          detectForVideo: vi.fn(),
          close: vi.fn(),
        }),
      },
    }));

    const success = await tracker.initialize();
    expect(success).toBe(true);
    expect(tracker.status).toBe('ready');
    expect(tracker.available).toBe(true);
  });

  it('handles initialization failure gracefully when MediaPipe fails', async () => {
    vi.doMock('@mediapipe/tasks-vision', () => ({
      FilesetResolver: {
        forVisionTasks: vi.fn().mockRejectedValue(new Error('Network error')),
      },
      HandLandmarker: {
        createFromOptions: vi.fn(),
      },
    }));

    const success = await tracker.initialize();
    expect(success).toBe(false);
    expect(tracker.status).toBe('error');
    expect(tracker.available).toBe(false);
  });
});
