'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, SwitchCamera } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export interface CameraCaptureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
  description?: string;
  /** Filename prefix for the captured JPEG (default: photo) */
  fileNamePrefix?: string;
  /** Prefer front camera for profile selfies */
  preferUserCamera?: boolean;
}

function isSecureCameraContext(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

export function supportsGetUserMedia(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * In-app camera: requests permission via getUserMedia, shows live preview, captures a JPEG.
 */
export function CameraCaptureDialog({
  isOpen,
  onClose,
  onCapture,
  title = 'Take photo',
  description = 'Allow camera access if prompted, then capture.',
  fileNamePrefix = 'photo',
  preferUserCamera = false,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [ready, setReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    preferUserCamera ? 'user' : 'environment'
  );
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setReady(false);
  }, []);

  const startCamera = useCallback(
    async (facing: 'environment' | 'user') => {
      if (!supportsGetUserMedia()) {
        setError(
          'This browser cannot open the camera. Use Choose file, or open this page on a phone browser.'
        );
        return;
      }
      if (!isSecureCameraContext()) {
        setError(
          'Camera needs a secure connection (HTTPS or localhost). Open the app with HTTPS to take photos.'
        );
        return;
      }

      setStarting(true);
      setError(null);
      setReady(false);
      stopStream();

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setReady(true);

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cams = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(cams.length > 1);
        } catch {
          setHasMultipleCameras(false);
        }
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setError(
            'Camera permission was denied. Allow camera access in your browser/device settings, then try again.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setError('No camera was found on this device.');
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setError('Camera is in use by another app. Close it and try again.');
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not open the camera. Try Choose file instead.'
          );
        }
      } finally {
        setStarting(false);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setError(null);
      return;
    }
    const initialFacing = preferUserCamera ? 'user' : 'environment';
    setFacingMode(initialFacing);
    void startCamera(initialFacing);
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preferUserCamera]);

  const switchCamera = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await startCamera(next);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !ready || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${fileNamePrefix}-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        stopStream();
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {hasMultipleCameras && (
            <Button
              type="button"
              variant="outline"
              leftIcon={<SwitchCamera className="h-4 w-4" />}
              onClick={() => void switchCamera()}
              isDisabled={starting || !!error}
            >
              Flip camera
            </Button>
          )}
          <Button
            type="button"
            leftIcon={<Camera className="h-4 w-4" />}
            onClick={handleCapture}
            isDisabled={!ready || starting || !!error}
          >
            Capture
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error ? (
          <div className="space-y-3">
            <Alert variant="danger">{error}</Alert>
            <Button
              type="button"
              variant="outline"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void startCamera(facingMode)}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="mx-auto max-h-[60vh] w-full object-contain"
            />
            {starting || !ready ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
                Starting camera…
              </div>
            ) : null}
          </div>
        )}
        <p className="text-xs text-gray-500">
          Your browser will ask for camera permission.
        </p>
      </div>
    </Dialog>
  );
}
