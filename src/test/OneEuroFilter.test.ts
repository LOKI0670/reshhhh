// ============================================================
// MIST — 1€ Filter Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { LowPassFilter, OneEuroFilter1D, OneEuroFilter2D } from '../engine/OneEuroFilter';

describe('LowPassFilter', () => {
  it('returns initial raw value on first call', () => {
    const lpf = new LowPassFilter();
    expect(lpf.filter(10, 0.5)).toBe(10);
  });

  it('smooths subsequent values with alpha', () => {
    const lpf = new LowPassFilter();
    lpf.filter(0, 0.5);
    const result = lpf.filter(10, 0.5);
    expect(result).toBe(5);
  });

  it('resets correctly', () => {
    const lpf = new LowPassFilter();
    lpf.filter(10, 0.5);
    expect(lpf.hasLastRawValue()).toBe(true);
    lpf.reset();
    expect(lpf.hasLastRawValue()).toBe(false);
  });
});

describe('OneEuroFilter1D', () => {
  it('filters scalar series smoothly', () => {
    const filter = new OneEuroFilter1D({ minCutoff: 1.0, beta: 0.02 });
    const v1 = filter.filter(100, 1000);
    expect(v1).toBe(100);

    const v2 = filter.filter(102, 1016);
    // Should dampen small noisy fluctuation
    expect(v2).toBeGreaterThan(100);
    expect(v2).toBeLessThan(102);
  });
});

describe('OneEuroFilter2D', () => {
  it('filters 2D point smoothly', () => {
    const filter = new OneEuroFilter2D({ minCutoff: 1.0, beta: 0.02 });
    const p1 = filter.filter({ x: 50, y: 50 }, 1000);
    expect(p1).toEqual({ x: 50, y: 50 });

    const p2 = filter.filter({ x: 52, y: 48 }, 1016);
    expect(p2.x).toBeGreaterThan(50);
    expect(p2.x).toBeLessThan(52);
    expect(p2.y).toBeLessThan(50);
    expect(p2.y).toBeGreaterThan(48);
  });
});
