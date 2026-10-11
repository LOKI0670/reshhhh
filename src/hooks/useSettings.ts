// ============================================================
// MIST — useSettings Hook
// Manages application settings with persistence
// ============================================================

import { useState, useCallback } from 'react';
import type { AppSettings, FogPreset } from '../types';
import { DEFAULT_SETTINGS } from '../utils/constants';

const STORAGE_KEY = 'mist-settings';

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  const setFogPreset = useCallback((preset: FogPreset) => {
    updateSettings({ fogPreset: preset });
  }, [updateSettings]);

  const setBrushSize = useCallback((size: number) => {
    updateSettings({ brushSize: size });
  }, [updateSettings]);

  const setFogDensity = useCallback((density: number) => {
    updateSettings({ fogDensity: density });
  }, [updateSettings]);

  const toggleMirrorFlip = useCallback(() => {
    updateSettings({ mirrorFlip: !settings.mirrorFlip });
  }, [settings.mirrorFlip, updateSettings]);

  const toggleHandTracking = useCallback(() => {
    updateSettings({ handTrackingEnabled: !settings.handTrackingEnabled });
  }, [settings.handTrackingEnabled, updateSettings]);

  const toggleSound = useCallback(() => {
    updateSettings({ soundEnabled: !settings.soundEnabled });
  }, [settings.soundEnabled, updateSettings]);

  const resetToDefaults = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    setFogPreset,
    setBrushSize,
    setFogDensity,
    toggleMirrorFlip,
    toggleHandTracking,
    toggleSound,
    resetToDefaults,
  };
}
