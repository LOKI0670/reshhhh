// ============================================================
// MIST — useCamera Hook
// Manages camera stream lifecycle with React
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraService } from '../services/CameraService';
import type { CameraPermission } from '../types';

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permission: CameraPermission;
  error: string | null;
  isReady: boolean;
  requestCamera: () => Promise<void>;
  stopCamera: () => void;
  isSupported: boolean;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [permission, setPermission] = useState<CameraPermission>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const serviceRef = useRef<CameraService | null>(null);

  useEffect(() => {
    serviceRef.current = new CameraService({
      onPermissionChange: setPermission,
      onStreamReady: (stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => setIsReady(true)).catch(console.warn);
          };
        }
      },
      onError: setError,
    });

    return () => {
      serviceRef.current?.stopCamera();
    };
  }, []);

  const requestCamera = useCallback(async () => {
    setError(null);
    setIsReady(false);
    await serviceRef.current?.requestCamera('user');
  }, []);

  const stopCamera = useCallback(() => {
    serviceRef.current?.stopCamera();
    setIsReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  return {
    videoRef,
    permission,
    error,
    isReady,
    requestCamera,
    stopCamera,
    isSupported: CameraService.isSupported(),
  };
}
