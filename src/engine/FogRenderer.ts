// ============================================================
// MIST — Fog Renderer
// Core canvas rendering engine for the fog mirror effect.
// Manages the fog canvas, erase strokes, and compositing.
// ============================================================

import type { Point, FogPresetConfig } from '../types';
import { createFogTextureCanvas } from './FogTexture';
import { StrokeHistory } from './StrokeHistory';

export interface RendererOptions {
  brushSize: number;
  fogDensity: number;
  dropletIntensity: number;
  preset: FogPresetConfig;
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
}

export class FogRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fogTexture: HTMLCanvasElement | null = null;
  private history: StrokeHistory;
  private isDrawing = false;
  private lastPoint: Point | null = null;
  private options: RendererOptions;
  private strokeStartSnapshot: ImageData | null = null;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.options = options;
    this.history = new StrokeHistory();
  }

  /** Initialize (or re-initialize) the fog texture */
  initFog(seed?: number, startWithFog = false): void {
    const { width, height } = this.canvas;
    this.fogTexture = createFogTextureCanvas(
      width,
      height,
      this.options.preset,
      this.options.fogDensity,
      this.options.dropletIntensity,
      seed
    );
    this.ctx.clearRect(0, 0, width, height);
    if (startWithFog) {
      this.restoreFullFog();
    }
    this.history.clear();
  }

  /** Draw the full fog texture onto the canvas (fill entire mirror) */
  restoreFullFog(): void {
    if (!this.fogTexture) return;
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this.fogTexture, 0, 0, width, height);
  }

  /** Clear all fog from canvas back to clean glass */
  clearFog(): void {
    const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.history.push(current);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Begin a stroke at the given point */
  beginStroke(point: Point): void {
    if (this.isDrawing) return;
    this.isDrawing = true;
    this.lastPoint = point;

    // Snapshot before stroke starts (for undo)
    this.strokeStartSnapshot = this.ctx.getImageData(
      0, 0, this.canvas.width, this.canvas.height
    );

    this.options.onStrokeStart?.();
    this.erasePoint(point);
  }

  /** Continue a stroke to the given point */
  continueStroke(point: Point): void {
    if (!this.isDrawing || !this.lastPoint) return;

    // Interpolate between last and current point for smooth gaps
    const dx = point.x - this.lastPoint.x;
    const dy = point.y - this.lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = this.options.brushSize * 0.2;

    if (dist < step) {
      this.erasePoint(point);
    } else {
      const steps = Math.ceil(dist / step);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        this.erasePoint({
          x: this.lastPoint.x + dx * t,
          y: this.lastPoint.y + dy * t,
        });
      }
    }

    this.lastPoint = point;
  }

  /** End the current stroke and push to history */
  endStroke(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.lastPoint = null;

    // Push pre-stroke snapshot for undo
    if (this.strokeStartSnapshot) {
      this.history.push(this.strokeStartSnapshot);
      this.strokeStartSnapshot = null;
    }

    this.options.onStrokeEnd?.();
  }

  /** Erase fog at a single point using destination-out compositing */
  private erasePoint(point: Point): void {
    const { ctx } = this;
    const size = this.options.brushSize;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    // Feathered radial gradient for soft edges
    const grad = ctx.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, size / 2
    );
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.4, 'rgba(0,0,0,0.85)');
    grad.addColorStop(0.75, 'rgba(0,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /** Undo the last stroke */
  undo(): boolean {
    const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const prev = this.history.undo(current);
    if (prev) {
      this.ctx.putImageData(prev, 0, 0);
      return true;
    }
    return false;
  }

  /** Redo an undone stroke */
  redo(): boolean {
    const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const next = this.history.redo(current);
    if (next) {
      this.ctx.putImageData(next, 0, 0);
      return true;
    }
    return false;
  }

  /** Clear all erased areas or clear the mirror */
  resetFog(): void {
    // Push current state for undo before reset
    const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.history.push(current);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Deposit steam/breath condensation fog onto the mirror.
   * Called continuously as user blows at the screen.
   */
  depositBreathFog(intensity: number, focalPoint?: Point): void {
    if (!this.fogTexture || intensity <= 0.01) return;
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Breath focal center defaults to mouth location or center of mirror
    const cx = focalPoint?.x ?? width / 2;
    const cy = focalPoint?.y ?? height * 0.58;
    const baseRadius = Math.min(width, height) * 0.35;
    const breathRadius = baseRadius * (0.6 + intensity * 0.85);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // 1. Soft radial heat/moisture plume gradient
    const plumeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, breathRadius);
    const alpha = Math.min(0.35, intensity * 0.22);
    const [r, g, b] = this.options.preset.color.split(',').map((s) => Number(s.trim()) || 232);

    plumeGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 1.5})`);
    plumeGrad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${alpha * 1.0})`);
    plumeGrad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`);
    plumeGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = plumeGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, breathRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Blend the velvety frosted texture localized strictly within the breath plume
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, breathRadius, 0, Math.PI * 2);
    ctx.clip?.();
    ctx.globalAlpha = Math.min(0.28, intensity * 0.18);
    ctx.drawImage(this.fogTexture, 0, 0, width, height);
    ctx.restore();

    ctx.restore();
  }

  /** Finalize breath condensation stroke for undo history */
  finalizeBreathStroke(): void {
    const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.history.push(current);
    this.options.onStrokeEnd?.();
  }

  /** Update options (e.g., brush size, density) */
  updateOptions(options: Partial<RendererOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /** Update preset and regenerate texture */
  updatePreset(preset: FogPresetConfig, fogDensity: number, dropletIntensity: number): void {
    this.options.preset = preset;
    this.options.fogDensity = fogDensity;
    this.options.dropletIntensity = dropletIntensity;
    this.initFog();
  }

  /** Resize the canvas and reinitialize */
  resize(width: number, height: number): void {
    // Save current state as image before resize
    const prevDataURL = this.canvas.toDataURL();
    this.canvas.width = width;
    this.canvas.height = height;
    this.initFog();

    // Try to restore drawn state (best-effort, imperfect but avoids blank screen)
    const img = new Image();
    img.onload = () => {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = prevDataURL;
  }

  get canUndo(): boolean {
    return this.history.canUndo();
  }

  get canRedo(): boolean {
    return this.history.canRedo();
  }

  get isStroking(): boolean {
    return this.isDrawing;
  }

  /** Export the canvas as a data URL (for screenshots) */
  exportDataURL(type = 'image/png', quality = 1): string {
    return this.canvas.toDataURL(type, quality);
  }
}
