// ============================================================
// MIST — Face & Breath Multimodal Tracker
// Tracks mouth opening via MediaPipe FaceLandmarker + audio breath via mic
// Condenses fog directly in front of the user's mouth on the mirror
// ============================================================

import type { BreathState, Point, BreathMode } from '../types';
import { OneEuroFilter1D, OneEuroFilter2D } from './OneEuroFilter';
import { BreathDetector } from './BreathDetector';

// Key Lip Landmarks in MediaPipe 478 Face Mesh
const UPPER_LIP_CENTER = 13;
const LOWER_LIP_CENTER = 14;
const FOREHEAD_TOP      = 10;
const CHIN_BOTTOM       = 152;

export type FaceBreathCallback = (state: BreathState) => void;

export class FaceBreathTracker {
  private faceLandmarker: unknown = null;
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastDetectionTime = 0;
  private detectionInterval = 1000 / 30; // 30 FPS for smooth facial tracking
  private callback: FaceBreathCallback;

  private videoElement: HTMLVideoElement | null = null;
  private canvasWidth = 640;
  private canvasHeight = 480;

  public mode: BreathMode = 'combined';

  // Audio mic breath detector instance
  private micDetector: BreathDetector;
  private micIntensity = 0;
  private isMicBlowing = false;

  // Smoothing filters for mouth position and openness
  private mouthPosFilter = new OneEuroFilter2D({ minCutoff: 1.0, beta: 0.03 });
  private mouthOpenFilter = new OneEuroFilter1D({ minCutoff: 1.2, beta: 0.04 });

  // Telemetry
  private mouthOpenness = 0;
  private isMouthOpen = false;
  private mouthPosition: Point | null = null;

  // Synthesizer steam audio
  private audioContext: AudioContext | null = null;
  private synthGain: GainNode | null = null;
  private synthFilter: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;

  // Manual simulation
  private manualBlowing = false;
  private manualIntensity = 0;

  public state: BreathState = {
    isSupported: true,
    isActive: false,
    isBlowing: false,
    intensity: 0,
    micIntensity: 0,
    mouthOpenness: 0,
    isMouthOpen: false,
    mouthPosition: null,
    mode: 'combined',
    permission: 'unknown',
  };

  constructor(callback: FaceBreathCallback) {
    this.callback = callback;
    // Connect mic detector callbacks
    this.micDetector = new BreathDetector((micState) => {
      this.micIntensity = micState.intensity;
      this.isMicBlowing = micState.isBlowing;
      this.evaluateMultimodalFusion();
    });
  }

  /** Initialize MediaPipe FaceLandmarker */
  async initialize(): Promise<boolean> {
    try {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      return true;
    } catch (err) {
      console.warn('[FaceBreathTracker] Failed to load FaceLandmarker:', err);
      return false;
    }
  }

  updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setMode(mode: BreathMode): void {
    this.mode = mode;
    this.evaluateMultimodalFusion();
  }

  /** Start video face tracking and audio mic detection */
  start(video: HTMLVideoElement, canvasWidth: number, canvasHeight: number, enableMic = true): void {
    this.videoElement = video;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.isRunning = true;

    this.mouthPosFilter.reset();
    this.mouthOpenFilter.reset();

    // Start mic breath detector if requested
    if (enableMic) {
      this.micDetector.start().then((ok) => {
        this.updateState({ permission: ok ? 'granted' : 'denied' });
      });
    }

    // Setup procedural steam audio synthesizer
    this.setupSteamSynthesizer();

    this.updateState({ isActive: true });
    this.loop();
  }

  /** Detection loop */
  private loop = (): void => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    if (now - this.lastDetectionTime < this.detectionInterval) return;
    this.lastDetectionTime = now;

    this.detectFace(now);
  };

  private detectFace(timestamp: number): void {
    if (!this.videoElement || !this.faceLandmarker) {
      this.evaluateMultimodalFusion();
      return;
    }
    if (this.videoElement.readyState < 2) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = (this.faceLandmarker as any).detectForVideo(
        this.videoElement,
        timestamp
      );

      if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
        this.mouthOpenness = 0;
        this.isMouthOpen = false;
        this.mouthPosition = null;
        this.mouthOpenFilter.reset();
        this.mouthPosFilter.reset();
        this.evaluateMultimodalFusion();
        return;
      }

      const lms = results.faceLandmarks[0];

      // ── Mouth Openness Metric ─────────────────────────────
      // 1. Blendshapes jawOpen & mouthFunnel
      let blendshapeOpenness = 0;
      if (results.faceBlendshapes && results.faceBlendshapes[0]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const categories = results.faceBlendshapes[0].categories as any[];
        const jawOpen = categories.find((c) => c.categoryName === 'jawOpen')?.score ?? 0;
        const mouthFunnel = categories.find((c) => c.categoryName === 'mouthFunnel')?.score ?? 0;
        const mouthPucker = categories.find((c) => c.categoryName === 'mouthPucker')?.score ?? 0;
        blendshapeOpenness = Math.max(jawOpen, mouthFunnel * 0.85, mouthPucker * 0.75);
      }

      // 2. Direct anatomical lip separation normalized by face size
      const upperLip = lms[UPPER_LIP_CENTER];
      const lowerLip = lms[LOWER_LIP_CENTER];
      const forehead = lms[FOREHEAD_TOP];
      const chin     = lms[CHIN_BOTTOM];

      const lipGap = Math.hypot(upperLip.x - lowerLip.x, upperLip.y - lowerLip.y);
      const faceHeight = Math.hypot(forehead.x - chin.x, forehead.y - chin.y);
      const anatomicalRatio = faceHeight > 0.05 ? lipGap / faceHeight : 0;

      // Closed mouth ratio is ~0.02 - 0.04. Wide open mouth is ~0.15 - 0.28.
      const anatomicalOpenness = Math.min(1.0, Math.max(0.0, (anatomicalRatio - 0.035) / (0.16 - 0.035)));

      // Combined raw openness: average of blendshape score and anatomical measurement
      const rawOpenness = Math.max(blendshapeOpenness, anatomicalOpenness);

      // Smooth with 1€ Filter
      this.mouthOpenness = Math.min(1.0, Math.max(0.0, this.mouthOpenFilter.filter(rawOpenness, timestamp)));
      // Mouth is open if openness is above 0.22
      this.isMouthOpen = this.mouthOpenness > 0.22;

      // ── Mouth Coordinate Mapping (object-fit: cover + mirror flip) ──
      const vidW = this.videoElement.videoWidth || 640;
      const vidH = this.videoElement.videoHeight || 480;
      const canvasW = this.canvasWidth;
      const canvasH = this.canvasHeight;

      const scale = Math.max(canvasW / vidW, canvasH / vidH);
      const renderedW = vidW * scale;
      const renderedH = vidH * scale;
      const offsetX = (canvasW - renderedW) / 2;
      const offsetY = (canvasH - renderedH) / 2;

      // Normalized mouth midpoint
      const normMouthX = (upperLip.x + lowerLip.x) / 2;
      const normMouthY = (upperLip.y + lowerLip.y) / 2;

      // Mirrored horizontal position: (1 - normMouthX)
      const mappedX = (1 - normMouthX) * renderedW + offsetX;
      const mappedY = normMouthY * renderedH + offsetY;

      const smoothMouthPos = this.mouthPosFilter.filter(
        { x: mappedX, y: mappedY },
        timestamp
      );

      this.mouthPosition = {
        x: Math.max(0, Math.min(canvasW, smoothMouthPos.x)),
        y: Math.max(0, Math.min(canvasH, smoothMouthPos.y)),
      };

      this.evaluateMultimodalFusion();
    } catch (err) {
      console.warn('[FaceBreathTracker] Face detection error:', err);
      this.evaluateMultimodalFusion();
    }
  }

  /** Multimodal Fusion: combines mouth openness + mic breath */
  private evaluateMultimodalFusion(): void {
    let combinedIntensity = 0;
    let isBlowingActive = false;

    if (this.manualBlowing) {
      combinedIntensity = this.manualIntensity;
      isBlowingActive = true;
    } else if (this.mode === 'mouth') {
      // Mouth opening only
      combinedIntensity = this.mouthOpenness;
      isBlowingActive = this.isMouthOpen;
    } else if (this.mode === 'mic') {
      // Microphone blowing only
      combinedIntensity = this.micIntensity;
      isBlowingActive = this.isMicBlowing;
    } else {
      // 'combined': Multimodal fusion
      // Either opening mouth or blowing triggers fog; doing both boosts condensation!
      if (this.isMouthOpen && this.isMicBlowing) {
        // Synergy: open mouth + exhalation sound = maximum steam!
        combinedIntensity = Math.min(1.0, this.mouthOpenness * 0.8 + this.micIntensity * 0.5 + 0.2);
        isBlowingActive = true;
      } else if (this.isMouthOpen) {
        combinedIntensity = this.mouthOpenness * 0.95;
        isBlowingActive = true;
      } else if (this.isMicBlowing) {
        combinedIntensity = this.micIntensity;
        isBlowingActive = true;
      } else {
        combinedIntensity = Math.max(this.mouthOpenness * 0.5, this.micIntensity);
        isBlowingActive = combinedIntensity > 0.15;
      }
    }

    this.updateSynthVolume(combinedIntensity);

    this.updateState({
      isBlowing: isBlowingActive,
      intensity: combinedIntensity,
      micIntensity: this.micIntensity,
      mouthOpenness: this.mouthOpenness,
      isMouthOpen: this.isMouthOpen,
      mouthPosition: this.mouthPosition,
      mode: this.mode,
    });
  }

  /** Procedural steam synthesizer */
  private setupSteamSynthesizer(): void {
    if (this.audioContext || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();

      const bufferSize = this.audioContext.sampleRate * 2;
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      this.noiseNode = this.audioContext.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      this.synthFilter = this.audioContext.createBiquadFilter();
      this.synthFilter.type = 'bandpass';
      this.synthFilter.frequency.value = 850;
      this.synthFilter.Q.value = 1.3;

      this.synthGain = this.audioContext.createGain();
      this.synthGain.gain.value = 0;

      this.noiseNode.connect(this.synthFilter);
      this.synthFilter.connect(this.synthGain);
      this.synthGain.connect(this.audioContext.destination);

      this.noiseNode.start();
    } catch {
      // Audio synth optional
    }
  }

  private updateSynthVolume(intensity: number): void {
    if (!this.synthGain || !this.synthFilter || !this.audioContext) return;
    const targetGain = Math.min(0.25, intensity * 0.22);
    this.synthGain.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.05);
    if (intensity > 0.1) {
      this.synthFilter.frequency.setTargetAtTime(700 + intensity * 450, this.audioContext.currentTime, 0.05);
    }
  }

  setManualBlowing(isBlowing: boolean, intensity = 0.9): void {
    this.manualBlowing = isBlowing;
    this.manualIntensity = isBlowing ? intensity : 0;
    this.evaluateMultimodalFusion();
  }

  private updateState(updates: Partial<BreathState>): void {
    this.state = { ...this.state, ...updates };
    this.callback(this.state);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.micDetector.stop();

    if (this.noiseNode) {
      try { this.noiseNode.stop(); } catch { /* ignore */ }
      this.noiseNode = null;
    }

    if (this.audioContext) {
      try { this.audioContext.close(); } catch { /* ignore */ }
      this.audioContext = null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (this.faceLandmarker) (this.faceLandmarker as any).close?.();
    this.faceLandmarker = null;

    this.updateState({
      isActive: false,
      isBlowing: false,
      intensity: 0,
      micIntensity: 0,
      mouthOpenness: 0,
      isMouthOpen: false,
      mouthPosition: null,
    });
  }
}
