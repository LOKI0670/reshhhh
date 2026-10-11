// ============================================================
// MIST — useFogCanvas Hook
// Manages the FogRenderer instance and pointer event handling
// ============================================================

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type RefObject,
} from 'react';
import { FogRenderer } from '../engine/FogRenderer';
import { FOG_PRESETS } from '../utils/constants';
import type { Point, AppSettings, FogPreset, InteractionMode } from '../types';

export interface UseFogCanvasReturn {
  fogCanvasRef: RefObject<HTMLCanvasElement | null>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  resetFog: () => void;
  reinitFog: (preset?: FogPreset, density?: number, droplets?: number) => void;
  depositBreathFog: (intensity: number, focalPoint?: Point) => void;
  finalizeBreathStroke: () => void;
  getExportDataURL: () => string;
  beginStroke: (point: Point) => void;
  continueStroke: (point: Point) => void;
  endStroke: () => void;
}

export function useFogCanvas(
  containerRef: RefObject<HTMLElement | null>,
  settings: AppSettings,
  mode: InteractionMode,
  enabled: boolean
): UseFogCanvasReturn {
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<FogRenderer | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedo = useCallback(() => {
    if (rendererRef.current) {
      setCanUndo(rendererRef.current.canUndo);
      setCanRedo(rendererRef.current.canRedo);
    }
  }, []);

  // Initialize renderer when canvas is ready
  useEffect(() => {
    const canvas = fogCanvasRef.current;
    if (!canvas || !enabled) return;

    const container = containerRef.current;
    const w = container?.clientWidth || canvas.width || 640;
    const h = container?.clientHeight || canvas.height || 480;
    canvas.width = w;
    canvas.height = h;

    const preset = FOG_PRESETS[settings.fogPreset];
    rendererRef.current = new FogRenderer(canvas, {
      brushSize: settings.brushSize,
      fogDensity: settings.fogDensity,
      dropletIntensity: settings.dropletIntensity,
      preset,
      onStrokeEnd: updateUndoRedo,
    });
    rendererRef.current.initFog();

    return () => {
      rendererRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Update brush size without reinit
  useEffect(() => {
    rendererRef.current?.updateOptions({ brushSize: settings.brushSize });
  }, [settings.brushSize]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const canvas = fogCanvasRef.current;
      const renderer = rendererRef.current;
      if (!canvas || !renderer) return;

      const { clientWidth: w, clientHeight: h } = container;
      if (w !== canvas.width || h !== canvas.height) {
        renderer.resize(w, h);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  const beginStroke = useCallback((point: Point) => {
    if (!enabled) return;
    rendererRef.current?.beginStroke(point);
  }, [enabled]);

  const continueStroke = useCallback((point: Point) => {
    if (!enabled) return;
    rendererRef.current?.continueStroke(point);
  }, [enabled]);

  const endStroke = useCallback(() => {
    rendererRef.current?.endStroke();
    updateUndoRedo();
  }, [updateUndoRedo]);

  const undo = useCallback(() => {
    rendererRef.current?.undo();
    updateUndoRedo();
  }, [updateUndoRedo]);

  const redo = useCallback(() => {
    rendererRef.current?.redo();
    updateUndoRedo();
  }, [updateUndoRedo]);

  const resetFog = useCallback(() => {
    rendererRef.current?.resetFog();
    updateUndoRedo();
  }, [updateUndoRedo]);

  const reinitFog = useCallback((
    preset?: FogPreset,
    density?: number,
    droplets?: number
  ) => {
    if (!rendererRef.current) return;
    const p = FOG_PRESETS[preset ?? settings.fogPreset];
    rendererRef.current.updatePreset(
      p,
      density ?? settings.fogDensity,
      droplets ?? settings.dropletIntensity
    );
    updateUndoRedo();
  }, [settings.fogPreset, settings.fogDensity, settings.dropletIntensity, updateUndoRedo]);

  const depositBreathFog = useCallback((intensity: number, focalPoint?: Point) => {
    rendererRef.current?.depositBreathFog(intensity, focalPoint);
  }, []);

  const finalizeBreathStroke = useCallback(() => {
    rendererRef.current?.finalizeBreathStroke();
    updateUndoRedo();
  }, [updateUndoRedo]);

  const getExportDataURL = useCallback((): string => {
    return rendererRef.current?.exportDataURL() ?? '';
  }, []);

  return {
    fogCanvasRef,
    canUndo,
    canRedo,
    undo,
    redo,
    resetFog,
    reinitFog,
    depositBreathFog,
    finalizeBreathStroke,
    getExportDataURL,
    beginStroke,
    continueStroke,
    endStroke,
  };
}
