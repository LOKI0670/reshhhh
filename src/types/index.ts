// ============================================================
// MIST — The Virtual Fog Mirror — Core Types
// ============================================================

/** Interaction modes available in the mirror */
export type InteractionMode = 'wipe' | 'write' | 'handtrack' | 'message';

/** Camera permission state */
export type CameraPermission = 'unknown' | 'requesting' | 'granted' | 'denied' | 'unavailable';

/** Application screen */
export type AppScreen = 'intro' | 'mirror' | 'demo';

/** Fog visual preset */
export type FogPreset =
  | 'classic'
  | 'morning'
  | 'heavy'
  | 'dewdrops'
  | 'dreamy'
  | 'clean';

/** A 2D point on the canvas */
export interface Point {
  x: number;
  y: number;
}

/** A drawing stroke (sequence of points) */
export interface Stroke {
  id: string;
  points: Point[];
  brushSize: number;
  timestamp: number;
}

/** Gesture style for hand tracking */
export type HandDrawGesture = 'pinch' | 'point';

/** 3D Landmark Point */
export interface HandLandmarkPoint {
  x: number;
  y: number;
  z: number;
}

/** Breath trigger source mode */
export type BreathMode = 'combined' | 'mouth' | 'mic';

/** Application settings */
export interface AppSettings {
  fogDensity: number;          // 0–1
  fogPreset: FogPreset;
  brushSize: number;           // pixels
  mirrorFlip: boolean;
  handTrackingEnabled: boolean;
  soundEnabled: boolean;
  dropletIntensity: number;    // 0–1
  breathDetectionEnabled: boolean;
  breathMode: BreathMode;
  showHandSkeleton: boolean;
  handGestureMode: HandDrawGesture;
}

/** Hand tracking state with advanced telemetry */
export interface HandTrackingState {
  isAvailable: boolean;
  isActive: boolean;
  isHandDetected: boolean;
  isPinching: boolean;
  pinchStrength: number;       // 0.0 (open) to 1.0 (firm pinch)
  gesture: HandDrawGesture;
  fingertipPosition: Point | null;
  landmarks: Point[] | null;   // Canvas-mapped 2D positions of all 21 joints
}

/** Real-time breath & mouth opening state */
export interface BreathState {
  isSupported: boolean;
  isActive: boolean;
  isBlowing: boolean;
  intensity: number;           // Combined intensity 0.0 to 1.0
  micIntensity: number;        // Microphone acoustic turbulence
  mouthOpenness: number;       // Face camera mouth openness 0.0 to 1.0
  isMouthOpen: boolean;
  mouthPosition: Point | null; // Canvas coordinates where mouth is located
  mode: BreathMode;
  permission: 'unknown' | 'requesting' | 'granted' | 'denied' | 'unavailable';
}

/** Camera state */
export interface CameraState {
  permission: CameraPermission;
  stream: MediaStream | null;
  error: string | null;
}

/** Fog preset configuration */
export interface FogPresetConfig {
  id: FogPreset;
  label: string;
  description: string;
  baseOpacity: number;
  noiseScale: number;
  blurAmount: number;
  color: string;
  droplets: boolean;
}

/** Export options */
export interface ExportOptions {
  includeWatermark: boolean;
  includeTimestamp: boolean;
  format: 'png' | 'jpeg';
  quality: number;
}

/** History entry for undo/redo */
export interface HistoryEntry {
  id: string;
  imageData: ImageData;
  timestamp: number;
}
