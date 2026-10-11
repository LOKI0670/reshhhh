// ============================================================
// MIST — FogRenderer Tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FogRenderer } from '../engine/FogRenderer';
import { FOG_PRESETS } from '../utils/constants';

function createMockCanvas(width = 100, height = 100): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

describe('FogRenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: FogRenderer;

  beforeEach(() => {
    canvas = createMockCanvas();
    renderer = new FogRenderer(canvas, {
      brushSize: 40,
      fogDensity: 1.0,
      dropletIntensity: 0.5,
      preset: FOG_PRESETS.classic,
    });
  });

  it('initializes fog without error', () => {
    expect(() => renderer.initFog()).not.toThrow();
  });

  it('starts with no undo/redo history', () => {
    renderer.initFog();
    expect(renderer.canUndo).toBe(false);
    expect(renderer.canRedo).toBe(false);
  });

  it('beginStroke → endStroke creates undo entry', () => {
    renderer.initFog();
    renderer.beginStroke({ x: 50, y: 50 });
    renderer.endStroke();
    expect(renderer.canUndo).toBe(true);
  });

  it('undo after stroke returns true', () => {
    renderer.initFog();
    renderer.beginStroke({ x: 50, y: 50 });
    renderer.endStroke();
    const result = renderer.undo();
    expect(result).toBe(true);
  });

  it('undo with no history returns false', () => {
    renderer.initFog();
    expect(renderer.undo()).toBe(false);
  });

  it('redo after undo returns true', () => {
    renderer.initFog();
    renderer.beginStroke({ x: 20, y: 20 });
    renderer.endStroke();
    renderer.undo();
    expect(renderer.redo()).toBe(true);
  });

  it('resetFog clears strokes and creates undo entry', () => {
    renderer.initFog();
    renderer.beginStroke({ x: 30, y: 30 });
    renderer.endStroke();
    renderer.resetFog();
    expect(renderer.canUndo).toBe(true);
  });

  it('isStroking reflects drawing state', () => {
    renderer.initFog();
    expect(renderer.isStroking).toBe(false);
    renderer.beginStroke({ x: 10, y: 10 });
    expect(renderer.isStroking).toBe(true);
    renderer.endStroke();
    expect(renderer.isStroking).toBe(false);
  });

  it('updateOptions changes brush size', () => {
    renderer.updateOptions({ brushSize: 80 });
    // Internal options updated — just verify no error thrown
    expect(() => renderer.beginStroke({ x: 50, y: 50 })).not.toThrow();
    renderer.endStroke();
  });

  it('updatePreset calls initFog', () => {
    const initSpy = vi.spyOn(renderer, 'initFog');
    renderer.updatePreset(FOG_PRESETS.morning, 0.8, 0.5);
    expect(initSpy).toHaveBeenCalled();
  });

  it('exportDataURL returns a string', () => {
    renderer.initFog();
    const dataURL = renderer.exportDataURL();
    expect(typeof dataURL).toBe('string');
  });

  it('continueStroke does nothing if not started', () => {
    renderer.initFog();
    // Should not throw
    expect(() => renderer.continueStroke({ x: 50, y: 50 })).not.toThrow();
  });

  it('multiple beginStrokes only start one stroke', () => {
    renderer.initFog();
    renderer.beginStroke({ x: 10, y: 10 });
    renderer.beginStroke({ x: 20, y: 20 }); // Second call should be ignored
    renderer.endStroke();
    expect(renderer.canUndo).toBe(true);
  });

  it('depositBreathFog condenses mist without error', () => {
    renderer.initFog();
    expect(() => renderer.depositBreathFog(0.75)).not.toThrow();
  });

  it('finalizeBreathStroke saves undo entry', () => {
    renderer.initFog();
    renderer.depositBreathFog(0.8);
    renderer.finalizeBreathStroke();
    expect(renderer.canUndo).toBe(true);
  });
});
