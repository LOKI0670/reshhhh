// ============================================================
// MIST — Fog Texture Generator
// Engine that generates the realistic fog canvas texture
// ============================================================

import type { FogPresetConfig } from '../types';

/** Simple seeded pseudo-random number generator (mulberry32) */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smoothstep interpolation */
function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

/** Bilinear value noise for organic fog texture */
function valueNoise(x: number, y: number, rand: () => number, gridSize: number): number {
  const gx = Math.floor(x / gridSize);
  const gy = Math.floor(y / gridSize);
  const fx = (x / gridSize) - gx;
  const fy = (y / gridSize) - gy;

  // Deterministic hash for grid points
  const h = (a: number, b: number) => {
    let v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    v = v - Math.floor(v);
    return v;
  };

  const v00 = h(gx, gy);
  const v10 = h(gx + 1, gy);
  const v01 = h(gx, gy + 1);
  const v11 = h(gx + 1, gy + 1);

  const sx = smoothstep(fx);
  const sy = smoothstep(fy);

  return (
    v00 * (1 - sx) * (1 - sy) +
    v10 * sx * (1 - sy) +
    v01 * (1 - sx) * sy +
    v11 * sx * sy
  );
}

/** Fractal brownian motion noise for layered fog */
function fbm(x: number, y: number, octaves: number, gridSize: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let max = 0;

  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * frequency, y * frequency, mulberry32(i * 1234), gridSize) * amplitude;
    max += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / max;
}


/** Generate realistic droplets on the fog canvas */
function generateDroplets(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  rand: () => number,
  color: string
): void {
  for (let i = 0; i < count; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const rx = rand() * 6 + 2;
    const ry = rx * (rand() * 0.5 + 0.5);
    const alpha = rand() * 0.3 + 0.05;

    // Draw an elliptical droplet with highlight
    ctx.save();
    ctx.globalAlpha = alpha;

    // Main drop
    const dropGrad = ctx.createRadialGradient(x - rx * 0.2, y - ry * 0.2, 0, x, y, Math.max(rx, ry));
    dropGrad.addColorStop(0, `rgba(255,255,255,0.9)`);
    dropGrad.addColorStop(0.5, `rgba(${color},0.5)`);
    dropGrad.addColorStop(1, `rgba(${color},0.1)`);

    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = dropGrad;
    ctx.fill();

    // Subtle streak below
    if (rand() > 0.6) {
      const streakLen = rand() * 20 + 5;
      ctx.globalAlpha = alpha * 0.3;
      ctx.strokeStyle = `rgba(${color},0.4)`;
      ctx.lineWidth = rx * 0.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y + ry);
      ctx.lineTo(x + (rand() - 0.5) * 4, y + ry + streakLen);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/** Tiny water mark streaks on glass */
function generateWaterMarks(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rand: () => number,
  color: string
): void {
  const count = Math.floor(rand() * 15 + 5);
  for (let i = 0; i < count; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const len = rand() * 60 + 10;
    const angle = rand() * 0.6 - 0.3 + Math.PI / 2;

    ctx.save();
    ctx.globalAlpha = rand() * 0.08 + 0.02;
    ctx.strokeStyle = `rgba(${color},0.4)`;
    ctx.lineWidth = rand() * 1.5 + 0.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Generates a full fog texture onto the given canvas.
 * Uses procedural noise + droplets for a realistic bathroom-mirror look.
 */
export function generateFogTexture(
  canvas: HTMLCanvasElement,
  preset: FogPresetConfig,
  densityMultiplier: number,
  dropletIntensity: number,
  seed: number = 42
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  const rand = mulberry32(seed);

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // 1. Base gradient — soft vignette
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.75
  );
  vignette.addColorStop(0, `rgba(${preset.color},${preset.baseOpacity * densityMultiplier * 0.85})`);
  vignette.addColorStop(0.6, `rgba(${preset.color},${preset.baseOpacity * densityMultiplier * 0.92})`);
  vignette.addColorStop(1, `rgba(${preset.color},${Math.min(1, preset.baseOpacity * densityMultiplier * 1.05)})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // 2. Noise layer for organic texture
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;
  const gridSize = Math.max(width, height) / 4;
  const [r, g, b] = preset.color.split(',').map(Number);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = fbm(x, y, 4, gridSize);
      const idx = (y * width + x) * 4;
      const alphaNoise = (n * 0.35 - 0.1) * densityMultiplier;

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.max(0, Math.min(255, alphaNoise * 255));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 3. Blur for soft, cloud-like look
  ctx.filter = `blur(${preset.blurAmount}px)`;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 0.6;
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.globalAlpha = 1;

  // 4. Droplets
  if (preset.droplets && dropletIntensity > 0) {
    const dropletCount = Math.floor(80 * dropletIntensity * densityMultiplier);
    generateDroplets(ctx, width, height, dropletCount, rand, preset.color);
  }

  // 5. Water marks / streaks
  generateWaterMarks(ctx, width, height, rand, preset.color);

  // 6. Light reflection shimmer at top
  const shimmer = ctx.createLinearGradient(0, 0, 0, height * 0.15);
  shimmer.addColorStop(0, `rgba(255,255,255,${0.12 * densityMultiplier})`);
  shimmer.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shimmer;
  ctx.fillRect(0, 0, width, height * 0.15);
}

/** Creates an offscreen canvas with the fog texture pre-rendered */
export function createFogTextureCanvas(
  width: number,
  height: number,
  preset: FogPresetConfig,
  densityMultiplier: number,
  dropletIntensity: number,
  seed?: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  generateFogTexture(canvas, preset, densityMultiplier, dropletIntensity, seed);
  return canvas;
}
