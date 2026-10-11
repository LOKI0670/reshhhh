// ============================================================
// MIST — 1€ Filter (One Euro Filter)
// Precise adaptive low-pass filter for human-computer interaction
// Eliminates jitter at low speeds; minimizes lag at high speeds
// (Casiez, Roussel, Vogel - CHI 2012)
// ============================================================

import type { Point } from '../types';

export class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.y = alpha * value + (1.0 - alpha) * this.s!;
    this.s = this.y;
    return this.y;
  }

  hasLastRawValue(): boolean {
    return this.y !== null;
  }

  lastRawValue(): number {
    return this.y ?? 0;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

export interface OneEuroConfig {
  /** Minimum cutoff frequency in Hz (lower = smoother when stationary) */
  minCutoff: number;
  /** Speed coefficient (higher = less lag during quick movements) */
  beta: number;
  /** Cutoff frequency for derivative filter in Hz */
  dCutoff: number;
}

export class OneEuroFilter1D {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number | null = null;

  constructor(config: Partial<OneEuroConfig> = {}) {
    this.minCutoff = config.minCutoff ?? 1.0;
    this.beta = config.beta ?? 0.02;
    this.dCutoff = config.dCutoff ?? 1.0;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(value: number, timestamp: number = performance.now()): number {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      return this.xFilter.filter(value, 1.0);
    }

    const dt = Math.max(0.001, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    // Estimate derivative (velocity)
    const prevX = this.xFilter.lastRawValue();
    const dx = (value - prevX) / dt;
    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff, dt));

    // Calculate dynamic cutoff frequency based on velocity
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, this.alpha(cutoff, dt));
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

export class OneEuroFilter2D {
  private xFilter: OneEuroFilter1D;
  private yFilter: OneEuroFilter1D;

  constructor(config: Partial<OneEuroConfig> = {}) {
    this.xFilter = new OneEuroFilter1D(config);
    this.yFilter = new OneEuroFilter1D(config);
  }

  filter(point: Point, timestamp: number = performance.now()): Point {
    return {
      x: this.xFilter.filter(point.x, timestamp),
      y: this.yFilter.filter(point.y, timestamp),
    };
  }

  reset(): void {
    this.xFilter.reset();
    this.yFilter.reset();
  }
}
