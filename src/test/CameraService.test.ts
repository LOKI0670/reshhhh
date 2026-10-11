// ============================================================
// MIST — CameraService Tests
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { CameraService } from '../services/CameraService';

describe('CameraService', () => {
  it('isSupported returns true when getUserMedia exists', () => {
    expect(CameraService.isSupported()).toBe(true);
  });

  it('isActive returns false when no stream', () => {
    const svc = new CameraService({
      onPermissionChange: vi.fn(),
      onStreamReady: vi.fn(),
      onError: vi.fn(),
    });
    expect(svc.isActive).toBe(false);
  });

  it('currentStream is null before camera start', () => {
    const svc = new CameraService({
      onPermissionChange: vi.fn(),
      onStreamReady: vi.fn(),
      onError: vi.fn(),
    });
    expect(svc.currentStream).toBeNull();
  });

  it('requestCamera calls onPermissionChange with requesting then granted', async () => {
    const onPermissionChange = vi.fn();
    const onStreamReady = vi.fn();
    const onError = vi.fn();

    const mockStream = {
      getTracks: () => [{ stop: vi.fn() }],
      active: true,
    } as unknown as MediaStream;

    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

    const svc = new CameraService({ onPermissionChange, onStreamReady, onError });
    await svc.requestCamera();

    expect(onPermissionChange).toHaveBeenCalledWith('requesting');
    expect(onPermissionChange).toHaveBeenCalledWith('granted');
    expect(onStreamReady).toHaveBeenCalledWith(mockStream);
    expect(onError).not.toHaveBeenCalled();
  });

  it('requestCamera handles NotAllowedError', async () => {
    const onPermissionChange = vi.fn();
    const onError = vi.fn();

    const err = Object.assign(new Error('Denied'), { name: 'NotAllowedError' });
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(err);

    const svc = new CameraService({
      onPermissionChange,
      onStreamReady: vi.fn(),
      onError,
    });
    await svc.requestCamera();

    expect(onPermissionChange).toHaveBeenCalledWith('denied');
    expect(onError).toHaveBeenCalled();
  });

  it('requestCamera handles NotFoundError', async () => {
    const onPermissionChange = vi.fn();
    const onError = vi.fn();

    const err = Object.assign(new Error('Not found'), { name: 'NotFoundError' });
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(err);

    const svc = new CameraService({
      onPermissionChange,
      onStreamReady: vi.fn(),
      onError,
    });
    await svc.requestCamera();

    expect(onPermissionChange).toHaveBeenCalledWith('unavailable');
  });

  it('stopCamera stops all tracks', async () => {
    const stopFn = vi.fn();
    const mockStream = {
      getTracks: () => [{ stop: stopFn }, { stop: stopFn }],
      active: true,
    } as unknown as MediaStream;

    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

    const svc = new CameraService({
      onPermissionChange: vi.fn(),
      onStreamReady: vi.fn(),
      onError: vi.fn(),
    });
    await svc.requestCamera();
    svc.stopCamera();

    expect(stopFn).toHaveBeenCalledTimes(2);
  });
});
