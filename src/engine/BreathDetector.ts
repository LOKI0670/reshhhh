// ============================================================
// MIST — Breath & Blowing Detection Engine
// Detects exhaling/blowing at the screen using Web Audio API
// Synthesizes atmospheric condensation audio feedback
// ============================================================

import type { BreathState } from '../types';

export type BreathCallback = (state: BreathState) => void;

export class BreathDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;

  // Sound synthesizer for breath/steam whoosh
  private synthGain: GainNode | null = null;
  private synthFilter: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;

  // Detection parameters
  private callback: BreathCallback;
  private isRunning = false;
  private isBlowing = false;
  private currentIntensity = 0;
  private ambientNoiseFloor = 0.015;
  private calibrationFrames = 0;
  private consecutiveBlowingFrames = 0;
  private consecutiveSilenceFrames = 0;

  // Manual simulation state (e.g. keyboard B or button)
  private manualIntensity = 0;
  private manualSimActive = false;

  public state: BreathState = {
    isSupported: typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext),
    isActive: false,
    isBlowing: false,
    intensity: 0,
    micIntensity: 0,
    mouthOpenness: 0,
    isMouthOpen: false,
    mouthPosition: null,
    mode: 'mic',
    permission: 'unknown',
  };

  constructor(callback: BreathCallback) {
    this.callback = callback;
  }

  /** Request microphone access and start breath detection */
  async start(): Promise<boolean> {
    if (!this.state.isSupported) {
      this.updateState({ permission: 'unavailable' });
      return false;
    }

    try {
      this.updateState({ permission: 'requesting' });

      // Request raw audio without browser noise suppression cancelling the breath!
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.mediaStream = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.3;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      // Setup audio synthesizer for steamy condensation feedback
      this.setupSteamSynthesizer();

      this.isRunning = true;
      this.calibrationFrames = 0;
      this.ambientNoiseFloor = 0.02;

      this.updateState({
        isActive: true,
        permission: 'granted',
      });

      this.loop();
      return true;
    } catch (err) {
      console.warn('[BreathDetector] Mic access error:', err);
      this.updateState({
        isActive: false,
        permission: 'denied',
      });
      return false;
    }
  }

  /** Set up real-time procedural steam audio */
  private setupSteamSynthesizer(): void {
    if (!this.audioContext) return;

    try {
      // 2 seconds of pink/white noise buffer
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

      // Soft breath resonance filter
      this.synthFilter = this.audioContext.createBiquadFilter();
      this.synthFilter.type = 'bandpass';
      this.synthFilter.frequency.value = 850;
      this.synthFilter.Q.value = 1.2;

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

  /** Detection loop */
  private loop = (): void => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    if (this.manualSimActive) {
      // Manual blowing simulation has priority
      this.processManualBlowing();
      return;
    }

    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Breath characteristics:
    // When someone blows on the microphone, energy is concentrated in lower-mid frequencies (60Hz - 1200Hz).
    // Bin resolution = sampleRate (e.g. 44100) / fftSize (512) ≈ 86Hz per bin.
    const lowEnd = 1;   // ~86Hz
    const midEnd = 14;  // ~1200Hz
    const highEnd = 35; // ~3000Hz

    let lowSum = 0;
    for (let i = lowEnd; i < midEnd; i++) {
      lowSum += dataArray[i];
    }
    const lowAvg = lowSum / (midEnd - lowEnd);

    let highSum = 0;
    for (let i = midEnd; i < highEnd; i++) {
      highSum += dataArray[i];
    }
    const highAvg = highSum / (highEnd - midEnd);

    const normLow = lowAvg / 255.0;
    const normHigh = highAvg / 255.0;

    // First 40 frames (~0.6s) auto-calibrate room ambient noise
    if (this.calibrationFrames < 40) {
      this.calibrationFrames++;
      this.ambientNoiseFloor = Math.max(this.ambientNoiseFloor, normLow * 1.25);
      return;
    }

    // Breath threshold: low frequencies rise noticeably above noise floor
    const threshold = Math.max(0.08, this.ambientNoiseFloor + 0.05);
    const hasBreathEnergy = normLow > threshold && (normLow > normHigh * 0.8);

    if (hasBreathEnergy) {
      this.consecutiveBlowingFrames++;
      this.consecutiveSilenceFrames = 0;
    } else {
      this.consecutiveSilenceFrames++;
      this.consecutiveBlowingFrames = 0;
    }

    const wasBlowing = this.isBlowing;
    if (this.consecutiveBlowingFrames >= 2) {
      this.isBlowing = true;
    } else if (this.consecutiveSilenceFrames >= 4) {
      this.isBlowing = false;
    }

    if (this.isBlowing) {
      const rawIntensity = Math.min(1.0, (normLow - threshold) / (0.7 - threshold));
      // Smooth intensity
      this.currentIntensity = this.currentIntensity * 0.7 + rawIntensity * 0.3;
    } else {
      this.currentIntensity = Math.max(0, this.currentIntensity * 0.85 - 0.02);
    }

    // Update synthesizer steam volume
    this.updateSynthVolume(this.currentIntensity);

    if (this.isBlowing !== wasBlowing || this.currentIntensity > 0.01) {
      this.updateState({
        isBlowing: this.isBlowing,
        intensity: this.currentIntensity,
        micIntensity: this.currentIntensity,
      });
    }
  };

  /** Update synthesized condensation breath sound volume */
  private updateSynthVolume(intensity: number): void {
    if (!this.synthGain || !this.synthFilter || !this.audioContext) return;
    const targetGain = Math.min(0.22, intensity * 0.2);
    this.synthGain.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.05);
    if (intensity > 0.1) {
      this.synthFilter.frequency.setTargetAtTime(700 + intensity * 400, this.audioContext.currentTime, 0.05);
    }
  }

  /** Manual simulation (holding button / pressing 'B') */
  setManualBlowing(isBlowing: boolean, intensity = 0.85): void {
    this.manualSimActive = isBlowing;
    this.manualIntensity = isBlowing ? intensity : 0;

    if (!this.isRunning && isBlowing) {
      // If mic wasn't started, init audio context for steam sound if possible
      if (!this.audioContext && typeof window !== 'undefined') {
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          this.audioContext = new AudioCtx();
          this.setupSteamSynthesizer();
        } catch {
          // ignore
        }
      }
    }

    if (!isBlowing) {
      this.isBlowing = false;
      this.currentIntensity = 0;
      this.updateSynthVolume(0);
      this.updateState({ isBlowing: false, intensity: 0, micIntensity: 0 });
    } else {
      this.processManualBlowing();
    }
  }

  private processManualBlowing(): void {
    this.isBlowing = true;
    this.currentIntensity = this.currentIntensity * 0.7 + this.manualIntensity * 0.3;
    this.updateSynthVolume(this.currentIntensity);
    this.updateState({
      isBlowing: true,
      intensity: this.currentIntensity,
      micIntensity: this.currentIntensity,
    });
  }

  private updateState(updates: Partial<BreathState>): void {
    this.state = { ...this.state, ...updates };
    this.callback(this.state);
  }

  /** Stop detection and release microphone */
  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.noiseNode) {
      try { this.noiseNode.stop(); } catch { /* ignore */ }
      this.noiseNode = null;
    }

    if (this.audioContext) {
      try { this.audioContext.close(); } catch { /* ignore */ }
      this.audioContext = null;
    }

    this.currentIntensity = 0;
    this.isBlowing = false;
    this.updateState({
      isActive: false,
      isBlowing: false,
      intensity: 0,
    });
  }
}
