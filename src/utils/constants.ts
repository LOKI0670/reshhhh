// ============================================================
// MIST — Fog Preset Configurations
// ============================================================

import type { FogPreset, FogPresetConfig, HandDrawGesture, BreathMode } from '../types';

export const FOG_PRESETS: Record<FogPreset, FogPresetConfig> = {
  classic: {
    id: 'classic',
    label: 'Classic Bathroom',
    description: 'Soft white condensation',
    baseOpacity: 0.88,
    noiseScale: 0.003,
    blurAmount: 14,
    color: '232,234,240',
    droplets: false,
  },
  morning: {
    id: 'morning',
    label: 'Morning Mist',
    description: 'Subtle, low-opacity mist',
    baseOpacity: 0.65,
    noiseScale: 0.002,
    blurAmount: 12,
    color: '222,226,236',
    droplets: false,
  },
  heavy: {
    id: 'heavy',
    label: 'Heavy Steam',
    description: 'Dense, cloudy fog',
    baseOpacity: 0.95,
    noiseScale: 0.004,
    blurAmount: 18,
    color: '218,222,230',
    droplets: false,
  },
  dewdrops: {
    id: 'dewdrops',
    label: 'Dew Drops',
    description: 'Condensation droplets on glass',
    baseOpacity: 0.78,
    noiseScale: 0.005,
    blurAmount: 10,
    color: '226,232,242',
    droplets: true,
  },
  dreamy: {
    id: 'dreamy',
    label: 'Dreamy Mirror',
    description: 'Cool-toned ethereal mist',
    baseOpacity: 0.82,
    noiseScale: 0.0025,
    blurAmount: 16,
    color: '214,220,242',
    droplets: false,
  },
  clean: {
    id: 'clean',
    label: 'Clean Glass',
    description: 'Minimal condensation',
    baseOpacity: 0.38,
    noiseScale: 0.0015,
    blurAmount: 8,
    color: '240,242,246',
    droplets: false,
  },
};

export const DEFAULT_SETTINGS = {
  fogDensity: 1.0,
  fogPreset: 'classic' as FogPreset,
  brushSize: 40,
  mirrorFlip: true,
  handTrackingEnabled: true,
  soundEnabled: true,
  dropletIntensity: 0.1,
  breathDetectionEnabled: true,
  breathMode: 'combined' as BreathMode,
  showHandSkeleton: true,
  handGestureMode: 'pinch' as HandDrawGesture,
};

export const MAX_HISTORY_ENTRIES = 20;
export const HAND_TRACKING_FPS = 15;
export const CONDENSATION_INTERVAL = 8000; // ms
