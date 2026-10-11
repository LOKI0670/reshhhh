// ============================================================
// MIST — Toolbar Component
// Bottom floating toolbar with mode selector and controls
// ============================================================

import React from 'react';
import type { InteractionMode } from '../types';
import '../styles/mirror.css';

interface ToolbarProps {
  mode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onResetFog: () => void;
  onSave: () => void;
  handTrackingEnabled: boolean;
  isBlowing?: boolean;
  onStartBlow?: () => void;
  onEndBlow?: () => void;
}

interface ModeConfig {
  id: InteractionMode;
  label: string;
  tooltip: string;
  icon: React.ReactNode;
}

const WipeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 11.5c1.5-3 3.5-5 6-5s4 2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M1 13h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M7.5 6V2M5 4l2.5-2.5L10 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WriteIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 12.5l2-0.5L12.5 3.5a1.4 1.4 0 0 0-2-2L2 10.5l-.5 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.5 3.5l1 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const HandIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 8V3a1 1 0 0 1 2 0v3.5M7.5 6.5a1 1 0 0 1 2 0V8M9.5 7.5a1 1 0 0 1 2 0V9.5c0 2-1 4-3 4h-1c-2 0-3-2-3-4V8l1-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MessageIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 4h10a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5l-3 2V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 7h5M5 9h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const UndoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6H9a3 3 0 0 1 0 6H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M3 6L5.5 3.5M3 6L5.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RedoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 6H5a3 3 0 0 0 0 6h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M11 6L8.5 3.5M11 6L8.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 2a5 5 0 1 0 4.33 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M11 1v3.5H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 10v2h10v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 2v7M4.5 6.5L7 9l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BlowIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 5.5h6a2 2 0 1 0-2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M1.5 8h8.5a2 2 0 1 1-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M1.5 10.5h4a1.5 1.5 0 1 0-1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  onModeChange,
  brushSize,
  onBrushSizeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onResetFog,
  onSave,
  handTrackingEnabled,
  isBlowing,
  onStartBlow,
  onEndBlow,
}) => {
  const modes: ModeConfig[] = [
    { id: 'wipe', label: 'Wipe', tooltip: 'Wipe away fog', icon: <WipeIcon /> },
    { id: 'write', label: 'Write', tooltip: 'Write on fog', icon: <WriteIcon /> },
    ...(handTrackingEnabled
      ? [{ id: 'handtrack' as InteractionMode, label: 'Hand (Pinch)', tooltip: 'Finger tracking — pinch fingers to draw', icon: <HandIcon /> }]
      : []),
    { id: 'message', label: 'Message', tooltip: 'Reveal a typed message', icon: <MessageIcon /> },
  ];

  return (
    <nav
      className="toolbar"
      role="toolbar"
      aria-label="Mirror controls"
    >
      {/* Mode selector */}
      <div className="toolbar-modes" role="group" aria-label="Interaction mode">
        {modes.map((m) => (
          <button
            key={m.id}
            className={`mode-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => onModeChange(m.id)}
            aria-pressed={mode === m.id}
            aria-label={m.tooltip}
            id={`mode-${m.id}-btn`}
            data-tooltip={m.tooltip}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Brush size */}
      <div className="toolbar-controls" style={{ maxWidth: 200, minWidth: 120 }}>
        <div className="slider-group">
          <span className="slider-label" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="6" cy="6" r="4" fill="currentColor" opacity="0.5"/>
            </svg>
          </span>
          <input
            id="brush-size-slider"
            type="range"
            className="slider"
            min={10}
            max={120}
            step={5}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            aria-label={`Brush size: ${brushSize}px`}
          />
          <span className="slider-label" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="9" r="7" fill="currentColor" opacity="0.5"/>
            </svg>
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="toolbar-actions" role="group" aria-label="Actions">
        {onStartBlow && (
          <button
            className={`btn-icon ${isBlowing ? 'active' : ''}`}
            onPointerDown={onStartBlow}
            onPointerUp={onEndBlow}
            onPointerLeave={onEndBlow}
            aria-label="Blow fog — hold to condense mist"
            id="blow-fog-btn"
            data-tooltip="Blow Fog (hold or press B)"
          >
            <BlowIcon />
          </button>
        )}

        <button
          className="btn-icon"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo last stroke"
          id="undo-btn"
          data-tooltip="Undo"
          style={{ opacity: canUndo ? 1 : 0.35 }}
        >
          <UndoIcon />
        </button>

        <button
          className="btn-icon"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo stroke"
          id="redo-btn"
          data-tooltip="Redo"
          style={{ opacity: canRedo ? 1 : 0.35 }}
        >
          <RedoIcon />
        </button>

        <button
          className="btn-icon"
          onClick={onResetFog}
          aria-label="Reset fog — restore full fog"
          id="reset-fog-btn"
          data-tooltip="Reset Fog"
        >
          <ResetIcon />
        </button>

        <button
          className="btn-icon"
          onClick={onSave}
          aria-label="Save mirror as image"
          id="save-btn"
          data-tooltip="Save Image"
        >
          <SaveIcon />
        </button>
      </div>
    </nav>
  );
};
