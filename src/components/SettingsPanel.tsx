// ============================================================
// MIST — Settings Panel Component
// ============================================================

import React from 'react';
import type { AppSettings, FogPreset } from '../types';
import { FOG_PRESETS } from '../utils/constants';
import '../styles/mirror.css';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onResetFog: () => void;
  onClose: () => void;
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  description?: string;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, checked, onChange, id, description }) => (
  <div className="settings-row">
    <label htmlFor={id} className="settings-label" title={description}>
      {label}
    </label>
    <label className="toggle-switch">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="toggle-slider" />
    </label>
  </div>
);

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  id: string;
  format?: (v: number) => string;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label, value, min, max, step, onChange, id, format
}) => (
  <div className="settings-section">
    <div className="settings-row">
      <label htmlFor={id} className="settings-label">{label}</label>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
        {format ? format(value) : value}
      </span>
    </div>
    <input
      id={id}
      type="range"
      className="slider"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
    />
  </div>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdate,
  onResetFog,
  onClose,
}) => {
  return (
    <aside
      className="settings-panel"
      role="dialog"
      aria-label="Settings"
      aria-modal="true"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.05em' }}>Settings</h2>
        <button
          className="btn-icon"
          onClick={onClose}
          aria-label="Close settings"
          id="close-settings-btn"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Fog Presets */}
      <section className="settings-section">
        <h3 className="settings-section-title">Fog Preset</h3>
        <div className="preset-grid" role="radiogroup" aria-label="Fog preset">
          {(Object.values(FOG_PRESETS)).map((preset) => (
            <button
              key={preset.id}
              className={`preset-item ${settings.fogPreset === preset.id ? 'active' : ''}`}
              onClick={() => onUpdate({ fogPreset: preset.id as FogPreset })}
              role="radio"
              aria-checked={settings.fogPreset === preset.id}
              aria-label={`${preset.label}: ${preset.description}`}
              id={`preset-${preset.id}`}
            >
              <div
                className="preset-swatch"
                style={{
                  background: `rgba(${preset.color},${preset.baseOpacity})`,
                }}
                aria-hidden="true"
              />
              <span className="preset-name">{preset.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Fog Controls */}
      <section className="settings-section">
        <h3 className="settings-section-title">Fog Controls</h3>
        <SliderRow
          id="fog-density-slider"
          label="Fog Density"
          value={settings.fogDensity}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(v) => onUpdate({ fogDensity: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <SliderRow
          id="droplet-intensity-slider"
          label="Droplet Intensity"
          value={settings.dropletIntensity}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onUpdate({ dropletIntensity: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <button
          className="btn btn-ghost"
          onClick={onResetFog}
          id="reset-fog-settings-btn"
          style={{ width: '100%', marginTop: 4 }}
        >
          Apply & Reset Fog
        </button>
      </section>

      {/* Brush */}
      <section className="settings-section">
        <h3 className="settings-section-title">Brush</h3>
        <SliderRow
          id="brush-size-settings-slider"
          label="Brush Size"
          value={settings.brushSize}
          min={10}
          max={120}
          step={5}
          onChange={(v) => onUpdate({ brushSize: v })}
          format={(v) => `${v}px`}
        />
      </section>

      {/* Mirror */}
      <section className="settings-section">
        <h3 className="settings-section-title">Mirror</h3>
        <ToggleRow
          id="mirror-flip-toggle"
          label="Horizontal Flip"
          description="Flip the camera horizontally like a real mirror"
          checked={settings.mirrorFlip}
          onChange={(v) => onUpdate({ mirrorFlip: v })}
        />
      </section>

      {/* Features */}
      <section className="settings-section">
        <h3 className="settings-section-title">Features & Gestures</h3>
        <ToggleRow
          id="hand-tracking-toggle"
          label="Hand Tracking"
          description="Use your fingers in the air to draw on the fog"
          checked={settings.handTrackingEnabled}
          onChange={(v) => onUpdate({ handTrackingEnabled: v })}
        />
        <ToggleRow
          id="skeleton-toggle"
          label="Show Hand Skeleton"
          description="Display futuristic glowing joint tracking skeleton"
          checked={settings.showHandSkeleton}
          onChange={(v) => onUpdate({ showHandSkeleton: v })}
        />
        <ToggleRow
          id="breath-toggle"
          label="Breath & Mouth Fog"
          description="Open your mouth or blow into mic to condense steamy fog on mirror"
          checked={settings.breathDetectionEnabled}
          onChange={(v) => onUpdate({ breathDetectionEnabled: v })}
        />
        <div className="settings-row" style={{ marginTop: 2 }}>
          <label htmlFor="breath-mode-select" className="settings-label">
            Fog Breath Source
          </label>
          <select
            id="breath-mode-select"
            value={settings.breathMode}
            onChange={(e) => onUpdate({ breathMode: e.target.value as 'combined' | 'mouth' | 'mic' })}
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="combined">Mouth Open + Mic (Best)</option>
            <option value="mouth">Mouth Opening Only (Face)</option>
            <option value="mic">Blowing Only (Microphone)</option>
          </select>
        </div>
        <div className="settings-row" style={{ marginTop: 2 }}>
          <label htmlFor="gesture-mode-select" className="settings-label">
            Draw Gesture
          </label>
          <select
            id="gesture-mode-select"
            value={settings.handGestureMode}
            onChange={(e) => onUpdate({ handGestureMode: e.target.value as 'pinch' | 'point' })}
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="pinch">Pinch to Draw (Natural)</option>
            <option value="point">Point Finger (Air Pen)</option>
          </select>
        </div>
        <ToggleRow
          id="sound-toggle"
          label="Sound Effects"
          description="Subtle ambient sounds while wiping and breathing"
          checked={settings.soundEnabled}
          onChange={(v) => onUpdate({ soundEnabled: v })}
        />
      </section>
    </aside>
  );
};
