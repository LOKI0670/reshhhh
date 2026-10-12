// ============================================================
// MIST — Clean, Silky Fog Texture Generator
// Produces smooth, velvety, realistic frosted glass condensation
// without high-frequency pixel grain or harsh noise artifacts.
// ============================================================

import type { FogPresetConfig } from '../types';

/** Mulberry32 PRNG for deterministic, natural organic billows */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft translucent micro-droplets on glass (only when enabled) */
function generateSoftDroplets(
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
    const r = rand() * 4 + 2;
    const alpha = rand() * 0.12 + 0.04;

    ctx.save();
    ctx.globalAlpha = alpha;

    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(0.6, `rgba(${color}, 0.3)`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Generates a clean, smooth, velvety fog texture onto the given canvas.
 * Uses layered soft radial vapor blooms and frosted diffusion to eliminate all graininess.
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
  if (width <= 0 || height <= 0) return;

  const rand = mulberry32(seed);
  const maxDim = Math.max(width, height);
  const [r, g, b] = preset.color.split(',').map((s) => Number(s.trim()) || 230);
  const rgb = `${r},${g},${b}`;
  const baseAlpha = Math.min(1, Math.max(0, preset.baseOpacity * densityMultiplier));

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Temporary offscreen canvas for soft diffusion pass
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  // ── 1. Base uniform frosted glass veil ─────────────────────────────
  tempCtx.fillStyle = `rgba(${rgb}, ${baseAlpha * 0.88})`;
  tempCtx.fillRect(0, 0, width, height);

  // ── 2. Subtle radial condensation gradient (softer center, thicker periphery) ──
  const vignette = tempCtx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    maxDim * 0.15,
    width * 0.5,
    height * 0.5,
    maxDim * 0.78
  );
  vignette.addColorStop(0, `rgba(${rgb}, ${baseAlpha * 0.05})`);
  vignette.addColorStop(0.7, `rgba(${rgb}, ${baseAlpha * 0.12})`);
  vignette.addColorStop(1, `rgba(${rgb}, ${baseAlpha * 0.18})`);
  tempCtx.fillStyle = vignette;
  tempCtx.fillRect(0, 0, width, height);

  // ── 3. Smooth, clean macro vapor clouds (soft billows without any pixel noise) ──
  const cloudCount = Math.floor(10 + rand() * 6);
  for (let i = 0; i < cloudCount; i++) {
    const cx = (rand() * 1.2 - 0.1) * width;
    const cy = (rand() * 1.2 - 0.1) * height;
    const radius = maxDim * (0.2 + rand() * 0.35);
    const cloudAlpha = baseAlpha * (0.04 + rand() * 0.07);

    const cloudGrad = tempCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    cloudGrad.addColorStop(0, `rgba(${rgb}, ${cloudAlpha * 1.4})`);
    cloudGrad.addColorStop(0.4, `rgba(${rgb}, ${cloudAlpha * 0.9})`);
    cloudGrad.addColorStop(0.8, `rgba(${rgb}, ${cloudAlpha * 0.3})`);
    cloudGrad.addColorStop(1, `rgba(${rgb}, 0)`);

    tempCtx.fillStyle = cloudGrad;
    tempCtx.beginPath();
    tempCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    tempCtx.fill();
  }

  // ── 4. Medium vapor swirls (gentle warmth plumes) ──────────────────
  const plumeCount = Math.floor(8 + rand() * 5);
  for (let i = 0; i < plumeCount; i++) {
    const px = (rand() * 1.1 - 0.05) * width;
    const py = (rand() * 1.1 - 0.05) * height;
    const pr = maxDim * (0.12 + rand() * 0.2);
    const pAlpha = baseAlpha * (0.03 + rand() * 0.05);

    const plumeGrad = tempCtx.createRadialGradient(px, py, 0, px, py, pr);
    plumeGrad.addColorStop(0, `rgba(255, 255, 255, ${pAlpha * 1.5})`);
    plumeGrad.addColorStop(0.5, `rgba(${rgb}, ${pAlpha * 0.7})`);
    plumeGrad.addColorStop(1, `rgba(${rgb}, 0)`);

    tempCtx.fillStyle = plumeGrad;
    tempCtx.beginPath();
    tempCtx.arc(px, py, pr, 0, Math.PI * 2);
    tempCtx.fill();
  }

  // ── 5. Ambient mirror light sheen (soft top reflection) ───────────
  const sheen = tempCtx.createLinearGradient(0, 0, 0, height * 0.25);
  sheen.addColorStop(0, `rgba(255, 255, 255, ${0.12 * densityMultiplier})`);
  sheen.addColorStop(0.4, `rgba(255, 255, 255, ${0.05 * densityMultiplier})`);
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  tempCtx.fillStyle = sheen;
  tempCtx.fillRect(0, 0, width, height * 0.25);

  // ── 6. Soft diffusion pass (creates velvety frosted glass feel) ────
  const blurPx = Math.max(8, preset.blurAmount || 14);
  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(tempCanvas, 0, 0, width, height);
  ctx.restore();

  // Overlay a light clean pass for crisp density without introducing grain
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.drawImage(tempCanvas, 0, 0, width, height);
  ctx.restore();

  // ── 7. Soft condensation droplets (only if explicitly enabled) ────
  if (preset.droplets && dropletIntensity > 0) {
    const dropletCount = Math.floor(35 * dropletIntensity * densityMultiplier);
    generateSoftDroplets(ctx, width, height, dropletCount, rand, rgb);
  }
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
