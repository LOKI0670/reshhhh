import '@testing-library/jest-dom';

// Mock canvas context for tests
const mockCtx = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  clip: vi.fn(),
  drawImage: vi.fn(),
  putImageData: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
  createImageData: vi.fn((w: number, h: number) => ({
    data: new Uint8ClampedArray(w * h * 4),
    width: w,
    height: h,
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  ellipse: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  setTransform: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  globalCompositeOperation: 'source-over',
  globalAlpha: 1,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'round' as CanvasLineCap,
  filter: 'none',
  font: '',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
};

// Patch HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockCtx),
  configurable: true,
});
Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: vi.fn(() => 'data:image/png;base64,'),
  configurable: true,
});

// Mock MediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [],
      active: true,
    }),
  },
  writable: true,
  configurable: true,
});

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => { cb(0); return 0; });
globalThis.cancelAnimationFrame = vi.fn();

// Mock ResizeObserver
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock crypto.randomUUID
Object.defineProperty(globalThis.crypto, 'randomUUID', {
  value: vi.fn(() => Math.random().toString(36).slice(2)),
  configurable: true,
});
