// ============================================================
// MIST — Advanced Hand Tracking Engine (MediaPipe Tasks Vision)
// 1€ Filter (One Euro Filter), 3D Multi-Landmark Pinch Fusion,
// Continuous Pinch Strength, Skeleton Mapping, Point/Pinch Gestures
// ============================================================

import type { HandTrackingState, Point, HandDrawGesture } from '../types';
import { OneEuroFilter2D, OneEuroFilter1D } from './OneEuroFilter';

// MediaPipe 21 Landmark Indices
const WRIST           = 0;
const THUMB_TIP       = 4;
const INDEX_PIP       = 6;
const INDEX_DIP       = 7;
const INDEX_TIP       = 8;
const MIDDLE_MCP      = 9;
const MIDDLE_PIP      = 10;
const MIDDLE_TIP      = 12;
const RING_PIP        = 14;
const RING_TIP        = 16;
const PINKY_PIP       = 18;
const PINKY_TIP       = 20;

// Continuous pinch thresholds (normalized against palm size)
const PINCH_DIST_MAX  = 0.52; // Above this, pinchStrength = 0
const PINCH_DIST_MIN  = 0.20; // Below this, pinchStrength = 1.0

// Hysteresis activation thresholds
const PINCH_TRIGGER_ON  = 0.82;
const PINCH_TRIGGER_OFF = 0.62;

export type HandTrackingCallback = (state: HandTrackingState) => void;

export type HandTrackingStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error';

export class HandTracking {
  private handLandmarker: unknown = null;
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastDetectionTime = 0;
  /** Run detection at up to 60 FPS for ultra-responsive tracking */
  private detectionInterval = 1000 / 60;
  private callback: HandTrackingCallback;
  private videoElement: HTMLVideoElement | null = null;
  private canvasWidth = 640;
  private canvasHeight = 480;
  private isAvailable = false;

  // Selected gesture mode: pinch or point
  public gestureMode: HandDrawGesture = 'pinch';

  // State debounce
  private confirmedActive = false;
  private activeFrames = 0;
  private inactiveFrames = 0;

  // High-precision 1€ Filters
  private positionFilter = new OneEuroFilter2D({
    minCutoff: 0.8, // 0.8 Hz when still: zero jitter
    beta: 0.025,    // Highly responsive when moving: zero lag
    dCutoff: 1.0,
  });

  private pinchFilter = new OneEuroFilter1D({
    minCutoff: 1.5,
    beta: 0.04,
    dCutoff: 1.0,
  });

  // Status for UI
  public status: HandTrackingStatus = 'idle';
  public statusMessage = '';

  constructor(callback: HandTrackingCallback) {
    this.callback = callback;
  }

  /** Initialize MediaPipe HandLandmarker */
  async initialize(): Promise<boolean> {
    this.status = 'loading';
    this.statusMessage = 'Loading advanced hand tracking model…';

    try {
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.65,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      this.isAvailable = true;
      this.status = 'ready';
      this.statusMessage = 'Hand tracking ready';
      return true;
    } catch (err) {
      console.warn('[HandTracking] Failed to initialize MediaPipe:', err);
      this.isAvailable = false;
      this.status = 'error';
      this.statusMessage = 'Hand tracking unavailable — use mouse or touch instead';
      return false;
    }
  }

  updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /** Start detection loop */
  start(video: HTMLVideoElement, canvasWidth: number, canvasHeight: number): void {
    if (!this.isAvailable || !this.handLandmarker) return;

    this.videoElement = video;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.isRunning = true;

    // Reset filters and debounce
    this.positionFilter.reset();
    this.pinchFilter.reset();
    this.confirmedActive = false;
    this.activeFrames = 0;
    this.inactiveFrames = 0;

    this.callback({
      isAvailable: true,
      isActive: true,
      isHandDetected: false,
      isPinching: false,
      pinchStrength: 0,
      gesture: this.gestureMode,
      fingertipPosition: null,
      landmarks: null,
    });

    this.loop();
  }

  /** Stop detection */
  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.positionFilter.reset();
    this.pinchFilter.reset();
    this.confirmedActive = false;

    this.callback({
      isAvailable: this.isAvailable,
      isActive: false,
      isHandDetected: false,
      isPinching: false,
      pinchStrength: 0,
      gesture: this.gestureMode,
      fingertipPosition: null,
      landmarks: null,
    });
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    if (now - this.lastDetectionTime < this.detectionInterval) return;
    this.lastDetectionTime = now;

    this.detect(now);
  };

  private detect(timestamp: number): void {
    if (!this.videoElement || !this.handLandmarker) return;
    if (this.videoElement.readyState < 2) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = (this.handLandmarker as any).detectForVideo(
        this.videoElement,
        timestamp
      );

      if (!results.landmarks || results.landmarks.length === 0) {
        this.positionFilter.reset();
        this.pinchFilter.reset();
        this.confirmedActive = false;
        this.activeFrames = 0;
        this.inactiveFrames = 0;

        this.callback({
          isAvailable: true,
          isActive: true,
          isHandDetected: false,
          isPinching: false,
          pinchStrength: 0,
          gesture: this.gestureMode,
          fingertipPosition: null,
          landmarks: null,
        });
        return;
      }

      const rawLandmarks = results.landmarks[0];
      const vidW = this.videoElement.videoWidth || 640;
      const vidH = this.videoElement.videoHeight || 480;
      const canvasW = this.canvasWidth;
      const canvasH = this.canvasHeight;

      // Coordinate scaling for CSS object-fit: cover + mirror flip
      const scale = Math.max(canvasW / vidW, canvasH / vidH);
      const renderedW = vidW * scale;
      const renderedH = vidH * scale;
      const offsetX = (canvasW - renderedW) / 2;
      const offsetY = (canvasH - renderedH) / 2;

      // Map all 21 landmarks into canvas pixels with mirror flip
      const mappedLandmarks: Point[] = rawLandmarks.map((lm: { x: number; y: number }) => ({
        x: Math.max(0, Math.min(canvasW, (1 - lm.x) * renderedW + offsetX)),
        y: Math.max(0, Math.min(canvasH, lm.y * renderedH + offsetY)),
      }));

      const wrist     = rawLandmarks[WRIST];
      const middleMCP = rawLandmarks[MIDDLE_MCP];
      const indexTip  = rawLandmarks[INDEX_TIP];
      const thumbTip  = rawLandmarks[THUMB_TIP];
      const indexDIP  = rawLandmarks[INDEX_DIP];
      const indexPIP  = rawLandmarks[INDEX_PIP];

      // ── Invariant Palm Scale ──────────────────────────────
      // Distance from wrist to middle MCP is invariant to finger poses
      const palmSize = Math.hypot(
        middleMCP.x - wrist.x,
        middleMCP.y - wrist.y
      );
      const safePalmSize = Math.max(0.04, palmSize);

      // ── 3D Multi-Landmark Pinch Metric ───────────────────
      // Primary 3D distance between thumb tip and index fingertip
      const dz = (thumbTip.z - indexTip.z) * 1.2;
      const dist3D = Math.hypot(
        thumbTip.x - indexTip.x,
        thumbTip.y - indexTip.y,
        dz
      );

      // Secondary distance to index DIP to handle natural thumb-to-side-of-finger grasp
      const distToDIP = Math.hypot(
        thumbTip.x - indexDIP.x,
        thumbTip.y - indexDIP.y
      );

      // Best pinch distance normalized against palm scale
      const bestDist = Math.min(dist3D, distToDIP * 1.15) / safePalmSize;

      // Continuous raw pinch metric in range [0..1]
      let rawPinchStrength = 0;
      if (bestDist <= PINCH_DIST_MIN) {
        rawPinchStrength = 1.0;
      } else if (bestDist >= PINCH_DIST_MAX) {
        rawPinchStrength = 0.0;
      } else {
        rawPinchStrength = (PINCH_DIST_MAX - bestDist) / (PINCH_DIST_MAX - PINCH_DIST_MIN);
      }

      // Smooth pinch strength with 1€ Filter
      const smoothPinchStrength = Math.min(
        1.0,
        Math.max(0.0, this.pinchFilter.filter(rawPinchStrength, timestamp))
      );

      // ── Gesture Detection: Point vs Pinch ─────────────────
      // Index is extended if index tip is further from wrist than index PIP
      const indexExtended = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) >
        Math.hypot(indexPIP.x - wrist.x, indexPIP.y - wrist.y) * 1.25;

      // Other fingers curled if their tips are closer to wrist than their PIPs
      const middleCurled = Math.hypot(rawLandmarks[MIDDLE_TIP].x - wrist.x, rawLandmarks[MIDDLE_TIP].y - wrist.y) <
        Math.hypot(rawLandmarks[MIDDLE_PIP].x - wrist.x, rawLandmarks[MIDDLE_PIP].y - wrist.y) * 1.15;
      const ringCurled = Math.hypot(rawLandmarks[RING_TIP].x - wrist.x, rawLandmarks[RING_TIP].y - wrist.y) <
        Math.hypot(rawLandmarks[RING_PIP].x - wrist.x, rawLandmarks[RING_PIP].y - wrist.y) * 1.15;
      const pinkyCurled = Math.hypot(rawLandmarks[PINKY_TIP].x - wrist.x, rawLandmarks[PINKY_TIP].y - wrist.y) <
        Math.hypot(rawLandmarks[PINKY_PIP].x - wrist.x, rawLandmarks[PINKY_PIP].y - wrist.y) * 1.15;

      const isPointingGesture = indexExtended && middleCurled && ringCurled && pinkyCurled;

      // Determine active stroke trigger with hysteresis
      let isStrokeActive = false;
      if (this.gestureMode === 'point') {
        isStrokeActive = isPointingGesture;
      } else {
        // Pinch mode (default): hysteresis prevents stroke flickering
        if (this.confirmedActive) {
          isStrokeActive = smoothPinchStrength > PINCH_TRIGGER_OFF;
        } else {
          isStrokeActive = smoothPinchStrength > PINCH_TRIGGER_ON;
        }
      }

      // Debounce trigger
      if (isStrokeActive) {
        this.activeFrames++;
        this.inactiveFrames = 0;
        if (this.activeFrames >= 2) {
          this.confirmedActive = true;
        }
      } else {
        this.inactiveFrames++;
        this.activeFrames = 0;
        if (this.inactiveFrames >= 2) {
          this.confirmedActive = false;
        }
      }

      // ── Cursor Contact Point ──────────────────────────────
      // When pinching, cursor is at contact point (midpoint of thumb and index tips)
      // When pointing or hovering, cursor is at index fingertip
      const rawTargetX = this.confirmedActive && this.gestureMode === 'pinch'
        ? (mappedLandmarks[INDEX_TIP].x + mappedLandmarks[THUMB_TIP].x) / 2
        : mappedLandmarks[INDEX_TIP].x;

      const rawTargetY = this.confirmedActive && this.gestureMode === 'pinch'
        ? (mappedLandmarks[INDEX_TIP].y + mappedLandmarks[THUMB_TIP].y) / 2
        : mappedLandmarks[INDEX_TIP].y;

      // 1€ Filter for silky smooth, zero-latency cursor position
      const filteredPoint = this.positionFilter.filter(
        { x: rawTargetX, y: rawTargetY },
        timestamp
      );

      const fingertipPosition: Point = {
        x: Math.max(0, Math.min(canvasW, filteredPoint.x)),
        y: Math.max(0, Math.min(canvasH, filteredPoint.y)),
      };

      this.callback({
        isAvailable: true,
        isActive: true,
        isHandDetected: true,
        isPinching: this.confirmedActive,
        pinchStrength: smoothPinchStrength,
        gesture: isPointingGesture ? 'point' : 'pinch',
        fingertipPosition,
        landmarks: mappedLandmarks,
      });
    } catch (err) {
      console.warn('[HandTracking] Detection error:', err);
    }
  }

  cleanup(): void {
    this.stop();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (this.handLandmarker) (this.handLandmarker as any).close?.();
    this.handLandmarker = null;
    this.status = 'idle';
  }

  get available(): boolean {
    return this.isAvailable;
  }
}
