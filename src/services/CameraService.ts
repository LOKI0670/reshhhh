// ============================================================
// MIST — Camera Service
// Manages WebRTC camera access, stream lifecycle, and cleanup
// ============================================================

import type { CameraPermission } from '../types';

export interface CameraServiceCallbacks {
  onPermissionChange: (permission: CameraPermission) => void;
  onStreamReady: (stream: MediaStream) => void;
  onError: (error: string) => void;
}

export class CameraService {
  private stream: MediaStream | null = null;
  private callbacks: CameraServiceCallbacks;

  constructor(callbacks: CameraServiceCallbacks) {
    this.callbacks = callbacks;
  }

  /** Request camera access — must be called after user interaction */
  async requestCamera(facingMode: 'user' | 'environment' = 'user'): Promise<void> {
    this.callbacks.onPermissionChange('requesting');

    try {
      // Request front-facing camera with high quality
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      this.callbacks.onPermissionChange('granted');
      this.callbacks.onStreamReady(stream);
    } catch (err) {
      const error = err as Error;

      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError'
      ) {
        this.callbacks.onPermissionChange('denied');
        this.callbacks.onError(
          'Camera access was denied. Please allow camera access in your browser settings to use the mirror.'
        );
      } else if (
        error.name === 'NotFoundError' ||
        error.name === 'DevicesNotFoundError'
      ) {
        this.callbacks.onPermissionChange('unavailable');
        this.callbacks.onError(
          'No camera was found on this device. You can still try Demo Mode.'
        );
      } else if (error.name === 'NotReadableError') {
        this.callbacks.onPermissionChange('unavailable');
        this.callbacks.onError(
          'Your camera is already in use by another application.'
        );
      } else {
        this.callbacks.onPermissionChange('unavailable');
        this.callbacks.onError(
          `Could not start camera: ${error.message || 'Unknown error'}`
        );
      }
    }
  }

  /** Stop all camera tracks and release resources */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  /** Check if camera is currently active */
  get isActive(): boolean {
    return this.stream !== null && this.stream.active;
  }

  /** Get current stream */
  get currentStream(): MediaStream | null {
    return this.stream;
  }

  /** Check if getUserMedia is supported */
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}
