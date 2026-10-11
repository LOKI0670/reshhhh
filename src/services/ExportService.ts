// ============================================================
// MIST — Image Export Service
// Composites camera frame + fog layer into a downloadable PNG
// ============================================================

import type { ExportOptions } from '../types';

export interface ExportResult {
  dataURL: string;
  filename: string;
}

/**
 * Composites the video frame and fog canvas into a single image.
 * Returns a data URL suitable for download.
 */
export async function exportMirrorImage(
  videoElement: HTMLVideoElement | null,
  fogCanvas: HTMLCanvasElement,
  options: ExportOptions,
  isDemoMode: boolean
): Promise<ExportResult> {
  const { width, height } = fogCanvas;

  // Create an offscreen canvas
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d')!;

  // 1. Fill background
  ctx.fillStyle = '#1a1c22';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw camera frame or demo placeholder
  if (videoElement && !isDemoMode) {
    ctx.save();
    // Mirror horizontally to match the display
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, 0, 0, width, height);
    ctx.restore();
  } else {
    // Demo mode: draw a placeholder gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#2a2d3a');
    grad.addColorStop(1, '#1a1c22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(200, 210, 230, 0.15)';
    ctx.font = `bold ${Math.floor(width / 15)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DEMO MODE', width / 2, height / 2);
  }

  // 3. Draw the fog canvas on top
  ctx.drawImage(fogCanvas, 0, 0, width, height);

  // 4. Optional: timestamp
  if (options.includeTimestamp) {
    const now = new Date();
    const ts = now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    ctx.save();
    ctx.font = `300 ${Math.floor(width / 55)}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(ts, width - 12, height - 12);
    ctx.restore();
  }

  // 5. Optional: MIST watermark
  if (options.includeWatermark) {
    ctx.save();
    ctx.font = `300 ${Math.floor(width / 40)}px Cormorant Garamond, serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('MIST', 14, height - 12);
    ctx.restore();
  }

  const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataURL = exportCanvas.toDataURL(mimeType, options.quality);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `mist-mirror-${timestamp}.${options.format}`;

  return { dataURL, filename };
}

/** Trigger a browser download of a data URL */
export function downloadDataURL(dataURL: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  link.click();
}
