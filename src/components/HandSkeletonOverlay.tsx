// ============================================================
// MIST — Hand Skeleton Overlay Component
// Futuristic glowing HUD skeleton visualizing the 21 finger joints
// ============================================================

import React, { useRef, useEffect } from 'react';
import type { Point } from '../types';

interface HandSkeletonOverlayProps {
  landmarks: Point[] | null;
  isPinching: boolean;
  pinchStrength: number;
  width: number;
  height: number;
  enabled: boolean;
}

// Finger joint connections
const BONES: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Knuckle Arch
  [5, 9], [9, 13], [13, 17],
];

export const HandSkeletonOverlay: React.FC<HandSkeletonOverlayProps> = ({
  landmarks,
  isPinching,
  pinchStrength,
  width,
  height,
  enabled,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!enabled || !landmarks || landmarks.length < 21) {
      return;
    }

    ctx.save();

    // 1. Draw bones (connecting lines)
    const boneColor = isPinching
      ? 'rgba(56, 239, 125, 0.45)'
      : 'rgba(168, 204, 255, 0.35)';

    ctx.strokeStyle = boneColor;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [start, end] of BONES) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      if (!p1 || !p2) continue;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // 2. Pinch connection arc between thumb tip (4) and index tip (8)
    const thumb = landmarks[4];
    const index = landmarks[8];
    if (thumb && index && pinchStrength > 0.15) {
      ctx.beginPath();
      ctx.moveTo(thumb.x, thumb.y);
      ctx.lineTo(index.x, index.y);
      ctx.strokeStyle = isPinching
        ? 'rgba(56, 239, 125, 0.85)'
        : `rgba(100, 220, 255, ${pinchStrength * 0.7})`;
      ctx.lineWidth = 1.5 + pinchStrength * 2.5;
      ctx.stroke();
    }

    // 3. Draw joint nodes
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      if (!pt) continue;

      const isTip = i === 4 || i === 8;
      const radius = isTip ? 4.5 : 2.5;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);

      if (isTip) {
        ctx.fillStyle = isPinching ? '#38ef7d' : '#82c8ff';
        ctx.shadowColor = isPinching ? '#38ef7d' : '#82c8ff';
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }

    ctx.restore();
  }, [landmarks, isPinching, pinchStrength, width, height, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="ht-skeleton-canvas"
      aria-hidden="true"
    />
  );
};
