// ============================================================
// MIST — Mirror View Component
// Core mirror experience: camera + fog canvas + interaction
// ============================================================

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import type { InteractionMode, AppSettings, HandTrackingState, Point, BreathState } from '../types';
import { useFogCanvas } from '../hooks/useFogCanvas';
import { useCamera } from '../hooks/useCamera';
import { HandTracking } from '../engine/HandTracking';
import { FaceBreathTracker } from '../engine/FaceBreathTracker';
import { HandSkeletonOverlay } from './HandSkeletonOverlay';
import { Toolbar } from './Toolbar';
import { SettingsPanel } from './SettingsPanel';
import '../styles/mirror.css';
import '../styles/handtracking.css';

interface MirrorViewProps {
  settings: AppSettings;
  onSettingsUpdate: (updates: Partial<AppSettings>) => void;
  isDemoMode: boolean;
  onExit: () => void;
  onShowPookieMessage?: () => void;
  getVideoRef?: (ref: HTMLVideoElement | null) => void;
}

// ── Coordinate mapping ──────────────────────────────────────
function getCanvasPoint(
  e: PointerEvent | MouseEvent | Touch,
  canvas: HTMLCanvasElement
): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

// ── Toast hook ──────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, duration = 2200) => {
    setToast(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { toast, showToast };
}

// ── Hand tracking loading states ────────────────────────────
type HTLoadState = 'idle' | 'loading' | 'ready' | 'error';

// ── Fingertip cursor that maps canvas coords → CSS pixels with dynamic pinch feedback ───
function FingertipCursor({
  pos,
  isPinching,
  pinchStrength,
  canvas,
}: {
  pos: Point;
  isPinching: boolean;
  pinchStrength: number;
  canvas: HTMLCanvasElement | null;
}) {
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;

  const cssX = rect.left + pos.x * scaleX;
  const cssY = rect.top + pos.y * scaleY;

  // Magnetic contraction: size scales smoothly from 36px down to 22px as pinch increases
  const ringSize = Math.max(20, Math.round(36 - pinchStrength * 14));
  const ringOpacity = 0.45 + pinchStrength * 0.55;

  return (
    <div
      className={`ht-cursor ${isPinching ? 'pinching' : ''}`}
      style={{ left: cssX, top: cssY }}
      aria-hidden="true"
    >
      <div
        className="ht-cursor-ring"
        style={{
          width: ringSize,
          height: ringSize,
          borderColor: isPinching ? '#38ef7d' : `rgba(168, 204, 255, ${ringOpacity})`,
        }}
      />
      <div className="ht-cursor-dot" />
      {isPinching && <div className="ht-cursor-ripple" />}
    </div>
  );
}

// ── Hand tracking overlay (loading / guide) ─────────────────
function HandTrackingOverlay({
  loadState,
  loadMessage,
  handDetected,
  isPinching,
  onDismiss,
}: {
  loadState: HTLoadState;
  loadMessage: string;
  handDetected: boolean;
  isPinching: boolean;
  onDismiss: () => void;
}) {
  if (loadState === 'ready' && handDetected) return null; // hide when working

  return (
    <div className="ht-overlay animate-fade-in" role="status" aria-live="polite">
      {loadState === 'loading' && (
        <div className="ht-overlay-content">
          <div className="ht-spinner" aria-hidden="true">
            <div /><div /><div /><div />
          </div>
          <p className="ht-overlay-title">Loading hand tracking…</p>
          <p className="ht-overlay-sub">{loadMessage}</p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="ht-overlay-content">
          <div className="ht-overlay-icon" aria-hidden="true">✕</div>
          <p className="ht-overlay-title">Hand tracking unavailable</p>
          <p className="ht-overlay-sub">
            {loadMessage || 'Try mouse or touch instead.'}
          </p>
          <button className="btn btn-ghost" onClick={onDismiss}
            style={{ marginTop: 12 }}>
            Use Mouse / Touch
          </button>
        </div>
      )}

      {loadState === 'ready' && !handDetected && (
        <div className="ht-overlay-content">
          {/* Animated hand guide */}
          <div className="ht-hand-guide" aria-hidden="true">
            <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Palm */}
              <path d="M20 55 Q18 80 40 85 Q62 80 60 55 L60 40 Q60 35 55 35 L55 30 Q55 25 50 25 L50 22 Q50 17 45 17 L45 20 Q45 15 40 15 Q35 15 35 20 L35 22 Q35 17 30 17 Q25 17 25 22 L25 40 Q22 40 21 45 Z"
                fill="rgba(168,184,216,0.15)" stroke="rgba(168,184,216,0.6)" strokeWidth="1.5" strokeLinejoin="round"/>
              {/* Index finger highlight */}
              <path d="M35 20 L35 10 Q35 5 40 5 Q45 5 45 10 L45 20"
                fill="rgba(168,184,216,0.3)" stroke="rgba(168,184,216,0.9)" strokeWidth="1.5" strokeLinejoin="round"/>
              {/* Thumb */}
              <path d="M25 35 L16 28 Q12 24 15 20 Q18 16 22 19 L25 22"
                fill="rgba(168,184,216,0.15)" stroke="rgba(168,184,216,0.6)" strokeWidth="1.5" strokeLinejoin="round"/>
              {/* Pinch arrows */}
              <path d="M12 12 L18 18" stroke="rgba(168,184,216,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M28 6 L28 14" stroke="rgba(168,184,216,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M40 2 L40 10" stroke="rgba(168,184,216,0.8)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          <p className="ht-overlay-title">Show your hand to the camera</p>
          <div className="ht-steps">
            <div className="ht-step">
              <span className="ht-step-num">1</span>
              <span>Point your index finger up</span>
            </div>
            <div className="ht-step">
              <span className="ht-step-num">2</span>
              <span>Pinch index + thumb together to draw</span>
            </div>
            <div className="ht-step">
              <span className="ht-step-num">3</span>
              <span>Release pinch to lift the brush</span>
            </div>
          </div>
        </div>
      )}

      {loadState === 'ready' && handDetected && !isPinching && (
        <div className="ht-overlay-content ht-overlay-compact">
          <p className="ht-overlay-hint">✧ Pinch index + thumb to draw</p>
        </div>
      )}
    </div>
  );
}

export const MirrorView: React.FC<MirrorViewProps> = ({
  settings,
  onSettingsUpdate,
  isDemoMode,
  onExit,
  onShowPookieMessage,
  getVideoRef,
}) => {
  const [mode, setMode] = useState<InteractionMode>('wipe');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Hand tracking state
  const [handState, setHandState] = useState<HandTrackingState>({
    isAvailable: false,
    isActive: false,
    isHandDetected: false,
    isPinching: false,
    pinchStrength: 0,
    gesture: settings.handGestureMode || 'pinch',
    fingertipPosition: null,
    landmarks: null,
  });
  const [htLoadState, setHtLoadState] = useState<HTLoadState>('idle');
  const [htLoadMsg, setHtLoadMsg] = useState('');
  const [htGuideVisible, setHtGuideVisible] = useState(true);

  // Breath & mouth opening state
  const [breathState, setBreathState] = useState<BreathState>({
    isSupported: true,
    isActive: false,
    isBlowing: false,
    intensity: 0,
    micIntensity: 0,
    mouthOpenness: 0,
    isMouthOpen: false,
    mouthPosition: null,
    mode: settings.breathMode || 'combined',
    permission: 'unknown',
  });
  const faceBreathTrackerRef = useRef<FaceBreathTracker | null>(null);
  const wasBlowingRef = useRef(false);

  const [messageText, setMessageText] = useState('');
  const { toast, showToast } = useToast();

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const handTrackerRef = useRef<HandTracking | null>(null);
  const isDrawingRef = useRef(false);

  // ── Camera ─────────────────────────────────────────────────
  const camera = useCamera();
  const { permission: cameraPermission, requestCamera } = camera;

  useEffect(() => {
    if (getVideoRef) getVideoRef(camera.videoRef.current);
  }, [camera.videoRef, getVideoRef]);

  useEffect(() => {
    if (!isDemoMode && cameraPermission === 'unknown') {
      requestCamera();
    }
  }, [isDemoMode, cameraPermission, requestCamera]);

  // ── Fog Canvas ─────────────────────────────────────────────
  const {
    fogCanvasRef,
    canUndo,
    canRedo,
    undo,
    redo,
    resetFog,
    reinitFog,
    depositBreathFog,
    finalizeBreathStroke,
    beginStroke,
    continueStroke,
    endStroke,
  } = useFogCanvas(viewportRef, settings, mode, true);

  // ── Reinit fog when preset / density changes ───────────────
  useEffect(() => {
    reinitFog(settings.fogPreset, settings.fogDensity, settings.dropletIntensity);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.fogPreset, settings.fogDensity, settings.dropletIntensity]);

  // ── Face & Breath Detection Lifecycle ──────────────────────
  useEffect(() => {
    if (!settings.breathDetectionEnabled) {
      faceBreathTrackerRef.current?.stop();
      return;
    }

    const tracker = new FaceBreathTracker((state) => {
      setBreathState(state);
    });
    faceBreathTrackerRef.current = tracker;
    tracker.mode = settings.breathMode;

    let mounted = true;

    tracker.initialize().then(() => {
      if (!mounted) return;
      const video = camera.videoRef.current;
      const canvas = fogCanvasRef.current;
      if (video && canvas) {
        const enableMic = settings.breathMode !== 'mouth';
        tracker.start(video, canvas.width, canvas.height, enableMic);
      }
    });

    return () => {
      mounted = false;
      tracker.stop();
    };
  }, [settings.breathDetectionEnabled, settings.breathMode, camera.isReady, camera.videoRef, fogCanvasRef]);

  // ── Sync breath mode updates ───────────────────────────────
  useEffect(() => {
    if (faceBreathTrackerRef.current) {
      faceBreathTrackerRef.current.setMode(settings.breathMode);
    }
  }, [settings.breathMode]);

  // ── Apply Breath Fog on Canvas as user opens mouth or blows ──
  useEffect(() => {
    if (breathState.isBlowing && breathState.intensity > 0) {
      // Condense directly at the mouth position on the mirror!
      depositBreathFog(breathState.intensity, breathState.mouthPosition ?? undefined);
      wasBlowingRef.current = true;
    } else if (wasBlowingRef.current && !breathState.isBlowing) {
      finalizeBreathStroke();
      wasBlowingRef.current = false;
      showToast('💨 Breath condensed on mirror');
    }
  }, [breathState.isBlowing, breathState.intensity, breathState.mouthPosition, depositBreathFog, finalizeBreathStroke, showToast]);

  const handleStartBlow = useCallback(() => {
    faceBreathTrackerRef.current?.setManualBlowing(true, 0.95);
  }, []);

  const handleEndBlow = useCallback(() => {
    faceBreathTrackerRef.current?.setManualBlowing(false);
  }, []);

  // ── Sync video element after camera ready ──────────────────
  useLayoutEffect(() => {
    if (camera.isReady && camera.videoRef.current) {
      if (getVideoRef) getVideoRef(camera.videoRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.isReady]);

  // ── Sync gesture mode with tracker ─────────────────────────
  useEffect(() => {
    if (handTrackerRef.current) {
      handTrackerRef.current.gestureMode = settings.handGestureMode;
    }
  }, [settings.handGestureMode]);

  // ── Auto-init hand tracking when mode = handtrack ──────────
  useEffect(() => {
    if (mode !== 'handtrack') {
      // Stop tracker when leaving hand mode
      handTrackerRef.current?.stop();
      setHtLoadState('idle');
      setHtGuideVisible(true);
      return;
    }

    // Already running
    if (handTrackerRef.current && htLoadState === 'ready') {
      return;
    }

    setHtLoadState('loading');
    setHtLoadMsg('Downloading model (~3MB)…');
    setHtGuideVisible(true);

    let mounted = true;

    const tracker = new HandTracking((state) => {
      if (!mounted) return;
      setHandState(state);
      // Hide guide once hand is confidently detected and drawing
      if (state.isHandDetected && state.isPinching) {
        setHtGuideVisible(false);
      }
    });
    tracker.gestureMode = settings.handGestureMode;
    handTrackerRef.current = tracker;

    tracker.initialize().then((ok) => {
      if (!mounted) return;

      if (!ok) {
        setHtLoadState('error');
        setHtLoadMsg(tracker.statusMessage);
        return;
      }

      setHtLoadState('ready');
      setHtLoadMsg('');

      const video = camera.videoRef.current;
      const canvas = fogCanvasRef.current;
      if (video && canvas) {
        tracker.start(video, canvas.width, canvas.height);
      } else if (!video) {
        setHtLoadState('error');
        setHtLoadMsg('Camera not available — please enable your camera first.');
      }
    });

    return () => {
      mounted = false;
      tracker.cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Hand-tracking → stroke (runs on every handState change) ─
  useEffect(() => {
    if (mode !== 'handtrack') return;
    const pos = handState.fingertipPosition;

    if (!pos) {
      if (isDrawingRef.current) {
        endStroke();
        isDrawingRef.current = false;
      }
      return;
    }

    if (handState.isPinching) {
      if (!isDrawingRef.current) {
        beginStroke(pos);
        isDrawingRef.current = true;
      } else {
        continueStroke(pos);
      }
    } else {
      if (isDrawingRef.current) {
        endStroke();
        isDrawingRef.current = false;
      }
    }
  }, [handState, mode, beginStroke, continueStroke, endStroke]);

  // ── Hide hint after first interaction ──────────────────────
  const hideHint = useCallback(() => setShowHint(false), []);

  // ── Pointer events (mouse / touch) ─────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (mode === 'handtrack' || mode === 'message') return;
      e.preventDefault();
      hideHint();
      const canvas = fogCanvasRef.current;
      if (!canvas) return;
      const point = getCanvasPoint(e.nativeEvent as PointerEvent, canvas);
      beginStroke(point);
      isDrawingRef.current = true;
      (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    },
    [mode, fogCanvasRef, beginStroke, hideHint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || mode === 'handtrack' || mode === 'message') return;
      e.preventDefault();
      const canvas = fogCanvasRef.current;
      if (!canvas) return;
      const point = getCanvasPoint(e.nativeEvent as PointerEvent, canvas);
      continueStroke(point);
    },
    [mode, fogCanvasRef, continueStroke]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    endStroke();
  }, [endStroke]);

  // ── Mode change handler ─────────────────────────────────────
  const handleModeChange = useCallback((newMode: InteractionMode) => {
    // If hand was drawing, end the stroke
    if (isDrawingRef.current) {
      endStroke();
      isDrawingRef.current = false;
    }
    setMode(newMode);
    if (newMode === 'handtrack') {
      showToast('📷 Activating hand tracking…');
    }
  }, [endStroke, showToast]);

  // ── Save ───────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const fogCanvas = fogCanvasRef.current;
    if (!fogCanvas) return;

    const { exportMirrorImage, downloadDataURL } = await import('../services/ExportService');
    const result = await exportMirrorImage(
      isDemoMode ? null : camera.videoRef.current,
      fogCanvas,
      { includeWatermark: true, includeTimestamp: true, format: 'png', quality: 1 },
      isDemoMode
    );
    downloadDataURL(result.dataURL, result.filename);
    showToast('Image saved ✓');
  }, [fogCanvasRef, camera.videoRef, isDemoMode, showToast]);

  // ── Sync trackers with canvas resize ──────────────────────
  useEffect(() => {
    const canvas = fogCanvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      if (canvas) {
        handTrackerRef.current?.updateCanvasSize(canvas.width, canvas.height);
        faceBreathTrackerRef.current?.updateCanvasSize(canvas.width, canvas.height);
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [fogCanvasRef]);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
      }
      if (e.key === 'h' || e.key === 'H') {
        handleModeChange(mode === 'handtrack' ? 'wipe' : 'handtrack');
      }
      if (e.key === 'w' || e.key === 'W') {
        handleModeChange('wipe');
      }
      if (e.key === 'd' || e.key === 'D') {
        handleModeChange('write');
      }
      if (e.key === 'b' || e.key === 'B') {
        if (!e.repeat) handleStartBlow();
      }
    };

    const upHandler = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        handleEndBlow();
      }
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', upHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [undo, redo, mode, handleModeChange, handleSave, handleStartBlow, handleEndBlow]);

  // ── Fullscreen ─────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Reveal typed message ───────────────────────────────────
  const handleMessageReveal = useCallback(() => {
    if (!messageText.trim()) return;
    const canvas = fogCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.font = `bold ${Math.min(canvas.width / 8, 72)}px Cormorant Garamond, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      ctx.fillText(messageText, canvas.width / 2, canvas.height / 2);
    }
    ctx.restore();

    setMessageText('');
    showToast('Message revealed!');
  }, [messageText, fogCanvasRef, showToast]);

  // ── Cursor class ───────────────────────────────────────────
  const cursorClass =
    mode === 'wipe'  ? 'cursor-wipe'  :
    mode === 'write' ? 'cursor-write' :
    mode === 'handtrack' ? 'cursor-none' :
    'cursor-hand';

  // ── Camera status ──────────────────────────────────────────
  const statusDotClass =
    isDemoMode ? 'demo' :
    camera.isReady ? 'active' :
    camera.permission === 'denied' || camera.permission === 'unavailable' ? 'error' :
    '';

  const statusLabel =
    isDemoMode ? 'Demo Mode' :
    camera.isReady ? 'Camera Active' :
    camera.permission === 'requesting' ? 'Connecting…' :
    camera.permission === 'denied' ? 'Access Denied' :
    camera.permission === 'unavailable' ? 'No Camera' :
    'Camera Off';

  return (
    <div className="mirror-layout" aria-label="MIST Mirror">
      {/* ── Top Bar ──────────────────────────────────────────── */}
      <header className="topbar" role="banner">
        <div className="topbar-brand">
          <div className="topbar-logo" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="9" cy="9" rx="7.5" ry="6" stroke="rgba(168,184,216,0.6)" strokeWidth="1"/>
              <ellipse cx="9" cy="9" rx="4" ry="3" stroke="rgba(168,184,216,0.4)" strokeWidth="1"/>
              <circle cx="9" cy="9" r="1.5" fill="rgba(168,184,216,0.7)"/>
            </svg>
          </div>
          <span className="topbar-name">MIST</span>
        </div>

        <div className="topbar-actions">
          <div
            className="camera-status"
            role="status"
            aria-live="polite"
            aria-label={`Camera status: ${statusLabel}`}
          >
            <span className={`camera-status-dot ${statusDotClass}`} aria-hidden="true" />
            <span>{statusLabel}</span>
          </div>

          {onShowPookieMessage && (
            <button
              className="btn-icon"
              onClick={onShowPookieMessage}
              aria-label="Message for Pookie"
              id="pookie-ribbon-btn"
              data-tooltip="Message for Pookie 🎀"
              style={{ color: '#ffb8d1' }}
            >
              <span style={{ fontSize: 16 }} aria-hidden="true">🎀</span>
            </button>
          )}

          <button
            className={`btn-icon ${isSettingsOpen ? 'active' : ''}`}
            onClick={() => setIsSettingsOpen((v) => !v)}
            aria-label="Toggle settings"
            aria-expanded={isSettingsOpen}
            id="settings-btn"
            data-tooltip="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>

          <button
            className="btn-icon"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            id="fullscreen-btn"
            data-tooltip={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 2H2v3M9 2h3v3M5 12H2V9M9 12h3V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          <button
            className="btn-icon"
            onClick={onExit}
            aria-label="Exit mirror"
            id="exit-btn"
            data-tooltip="Exit"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 2H2v10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Settings Panel ─────────────────────────────────────── */}
      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          onUpdate={onSettingsUpdate}
          onResetFog={() => { reinitFog(); showToast('Fog reset'); }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* ── Mirror Viewport ────────────────────────────────────── */}
      <main
        ref={viewportRef}
        className="mirror-viewport"
        aria-label="Mirror viewport"
      >
        {/* Demo background */}
        {isDemoMode && (
          <div className="demo-bg" aria-hidden="true">
            <span className="demo-bg-text">DEMO</span>
          </div>
        )}

        {/* Live video */}
        <video
          ref={camera.videoRef}
          className={`mirror-video ${!settings.mirrorFlip ? 'no-flip' : ''} ${isDemoMode ? 'demo-mode' : ''}`}
          playsInline
          muted
          autoPlay
          aria-label="Live camera feed"
          aria-hidden="true"
        />

        {/* No-camera overlay */}
        {!isDemoMode && !camera.isReady && (
          <div
            className="no-camera-overlay animate-fade-in"
            role="status"
            aria-live="polite"
          >
            {camera.permission === 'requesting' ? (
              <>
                <div className="animate-pulse" style={{ fontSize: 32 }}>○</div>
                <h2>Connecting to camera…</h2>
                <p>Please allow camera access when your browser asks.</p>
              </>
            ) : camera.permission === 'denied' ? (
              <>
                <h2>Camera access denied</h2>
                <p>{camera.error}</p>
                <button className="btn btn-ghost" onClick={camera.requestCamera}>
                  Try Again
                </button>
              </>
            ) : camera.permission === 'unavailable' ? (
              <>
                <h2>No camera found</h2>
                <p>{camera.error}</p>
              </>
            ) : null}
          </div>
        )}

        {/* Fog Canvas */}
        <canvas
          ref={fogCanvasRef}
          className={`fog-canvas ${cursorClass}`}
          aria-label="Fog layer — drag to wipe away fog"
          role="img"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* ── Hand Skeleton Overlay ──────────────────────────────── */}
        {mode === 'handtrack' && fogCanvasRef.current && (
          <HandSkeletonOverlay
            landmarks={handState.landmarks}
            isPinching={handState.isPinching}
            pinchStrength={handState.pinchStrength}
            width={fogCanvasRef.current.width}
            height={fogCanvasRef.current.height}
            enabled={settings.showHandSkeleton}
          />
        )}

        {/* ── Hand tracking UI ──────────────────────────────────── */}
        {mode === 'handtrack' && htGuideVisible && (
          <HandTrackingOverlay
            loadState={htLoadState}
            loadMessage={htLoadMsg}
            handDetected={handState.isHandDetected}
            isPinching={handState.isPinching}
            onDismiss={() => handleModeChange('wipe')}
          />
        )}

        {/* Fingertip cursor with magnetic pinch feedback */}
        {mode === 'handtrack' && handState.fingertipPosition && (
          <FingertipCursor
            pos={handState.fingertipPosition}
            isPinching={handState.isPinching}
            pinchStrength={handState.pinchStrength}
            canvas={fogCanvasRef.current}
          />
        )}

        {/* Telemetry status badge — compact, top-right, when tracking active */}
        {mode === 'handtrack' && htLoadState === 'ready' && handState.isHandDetected && (
          <div
            className={`ht-status-badge ${handState.isPinching ? 'drawing' : ''}`}
            aria-hidden="true"
          >
            {handState.isPinching
              ? (handState.gesture === 'point' ? '✦ Air-Pen Drawing' : '✦ Pinch Drawing')
              : (settings.handGestureMode === 'point'
                  ? '✧ Point index finger to draw'
                  : `✧ Pinch to draw (${Math.round(handState.pinchStrength * 100)}%)`)}
          </div>
        )}

        {/* ── Breath & Mouth Condensation HUD ─────────────────── */}
        {settings.breathDetectionEnabled && (
          <div
            className={`breath-indicator ${breathState.isBlowing ? 'blowing' : ''}`}
            role="status"
            aria-label="Breath condensation detector"
          >
            <span className="breath-icon" aria-hidden="true">
              {breathState.isMouthOpen ? '👄' : '💨'}
            </span>
            <div className="breath-text">
              <span>
                {breathState.isBlowing
                  ? breathState.isMouthOpen && breathState.micIntensity > 0.08
                    ? `Mouth + Mic Exhaling (${Math.round(breathState.intensity * 100)}%)`
                    : breathState.isMouthOpen
                    ? `Mouth Breath Condensing (${Math.round(breathState.mouthOpenness * 100)}%)`
                    : `Mic Blowing Condensing (${Math.round(breathState.intensity * 100)}%)`
                  : settings.breathMode === 'mouth'
                  ? 'Open mouth to condense fog'
                  : settings.breathMode === 'mic'
                  ? 'Blow at screen to fog'
                  : 'Open mouth or blow to fog'}
              </span>
              <div className="breath-meter-bar" aria-hidden="true">
                <div
                  className="breath-meter-fill"
                  style={{ width: `${Math.round(breathState.intensity * 100)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              className={`btn-blow ${breathState.isBlowing ? 'active' : ''}`}
              onPointerDown={handleStartBlow}
              onPointerUp={handleEndBlow}
              onPointerLeave={handleEndBlow}
              title="Hold to blow fog onto mirror (or press B)"
            >
              Blow
            </button>
          </div>
        )}

        {/* Interaction hint (wipe / write) */}
        {showHint && (mode === 'wipe' || mode === 'write') && (
          <p className="mirror-hint" aria-hidden="true">
            {mode === 'wipe' ? 'Drag to wipe away the fog' : 'Draw or write freely'}
          </p>
        )}

        {/* Message mode overlay */}
        {mode === 'message' && (
          <div className="message-overlay">
            <form
              className="glass-md message-form"
              onSubmit={(e) => { e.preventDefault(); handleMessageReveal(); }}
              aria-label="Message reveal"
            >
              <input
                className="message-input"
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message to reveal…"
                maxLength={40}
                aria-label="Message to reveal in the fog"
                id="message-input"
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-ghost"
                disabled={!messageText.trim()}
                aria-label="Reveal message in fog"
                style={{ flexShrink: 0 }}
              >
                Reveal
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ── Toolbar ────────────────────────────────────────────── */}
      <Toolbar
        mode={mode}
        onModeChange={handleModeChange}
        brushSize={settings.brushSize}
        onBrushSizeChange={(s) => onSettingsUpdate({ brushSize: s })}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onResetFog={() => { resetFog(); showToast('Fog restored'); }}
        onSave={handleSave}
        handTrackingEnabled={true}
        isBlowing={breathState.isBlowing}
        onStartBlow={handleStartBlow}
        onEndBlow={handleEndBlow}
      />

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
};
