import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

import { extractFaceDescriptor, loadFaceApiModels } from '../../lib/faceBiometrics';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profilePhotoUrl: string) => void;
  studentName?: string;
  registerNumber?: string;
}

export const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentName,
  registerNumber,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[] | null>(null);

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setCapturedSnapshot(null);
      setCapturedDescriptor(null);
      setStatusText(null);
      // Preload face models in background
      loadFaceApiModels().catch((e) => console.warn('[FaceAPI] Preload error:', e));
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      setIsCameraActive(false);
      setErrorMsg('Camera access was denied or unavailable. Please grant camera permission in your browser.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const takeSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame (mirror image for intuitive selfie view)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    setIsLoading(true);
    setStatusText('Detecting face & extracting biometric landmarks...');
    setErrorMsg(null);

    try {
      const bioResult = await extractFaceDescriptor(canvas);
      if (!bioResult.success || !bioResult.descriptor) {
        setErrorMsg(bioResult.error || 'No human face detected. Please face the camera directly in good lighting.');
        return;
      }

      setCapturedSnapshot(base64);
      setCapturedDescriptor(bioResult.descriptor);
      stopCamera();
    } catch (err: any) {
      setErrorMsg(err.message || 'Face detection failed. Ensure good lighting and retry.');
    } finally {
      setIsLoading(false);
      setStatusText(null);
    }
  };

  const retakeSnapshot = () => {
    setCapturedSnapshot(null);
    setCapturedDescriptor(null);
    setErrorMsg(null);
    setStatusText(null);
    startCamera();
  };

  const handleRegisterFace = async () => {
    if (!capturedSnapshot) {
      setErrorMsg('Please capture a clear photo first.');
      return;
    }

    setIsLoading(true);
    setStatusText('Encrypting & registering biometric profile...');
    setErrorMsg(null);

    try {
      const res = await api.enrollFace(capturedSnapshot, capturedDescriptor || undefined);
      setSuccessMsg(res.message || 'Face ID registered successfully!');
      setTimeout(() => {
        onSuccess(res.profilePhotoUrl);
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Face enrollment failed. Please try again with clear lighting.');
    } finally {
      setIsLoading(false);
      setStatusText(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-[#202028]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                Face ID Registration
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                {studentName || 'Student'} ({registerNumber || 'ID'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1c1c24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Instructions Banner */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Mandatory Baseline Face Portrait</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/90">
              Align your face inside the frame. Ensure good lighting, remove face masks or dark sunglasses, and look directly into the camera.
            </p>
          </div>

          {/* Camera Viewfinder / Preview */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
            {capturedSnapshot ? (
              <img
                src={capturedSnapshot}
                alt="Captured Snapshot"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Oval Face Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[68%] h-[78%] rounded-[50%] border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-xs tracking-wider uppercase">
                      Center Face
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Hidden canvas used to capture high-res frame */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Status Notifications */}
          {statusText && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
              <span>{statusText}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-100 dark:border-[#202028] bg-zinc-50/50 dark:bg-[#181820]/50 flex gap-2">
          {capturedSnapshot ? (
            <>
              <button
                type="button"
                onClick={retakeSnapshot}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={handleRegisterFace}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Register</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={takeSnapshot}
              disabled={!isCameraActive || isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Face Photo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
