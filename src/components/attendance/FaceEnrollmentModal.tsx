import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck, Sun } from 'lucide-react';
import { api } from '../../services/api';
import { cameraCapture } from '../../lib/cameraCapture';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profilePhotoUrl: string, updatedStudent?: any) => void;
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
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lightingFeedback, setLightingFeedback] = useState<string>('Align face in oval');

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetModal();
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const resetModal = () => {
    setCapturedSnapshot(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setStatusText(null);
    setLightingFeedback('Align face in oval');
  };

  const startCamera = async () => {
    try {
      stopCamera();
      if (!videoRef.current) return;
      const stream = await cameraCapture.startCamera(videoRef.current, 'user');
      streamRef.current = stream;
      setIsCameraActive(true);
      setErrorMsg(null);
    } catch (err: any) {
      setIsCameraActive(false);
      setErrorMsg('Camera access was denied or unavailable. Please grant camera permission in your browser.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      cameraCapture.stopCamera(streamRef.current);
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    try {
      // Quality check
      const quality = cameraCapture.checkFrameQuality(videoRef.current);
      setLightingFeedback(quality.message);

      const base64 = cameraCapture.captureFrame(videoRef.current, 0.95);
      setCapturedSnapshot(base64);
      stopCamera();
    } catch (err: any) {
      setErrorMsg(err.message || 'Capture failed. Please retry.');
    }
  };

  const retakeSnapshot = () => {
    setCapturedSnapshot(null);
    setErrorMsg(null);
    startCamera();
  };

  const handleRegisterFace = async () => {
    if (!capturedSnapshot) {
      setErrorMsg('Please capture a face photo first.');
      return;
    }

    setIsLoading(true);
    setStatusText('Encrypting & enrolling face ID with Cloud AI...');
    setErrorMsg(null);

    try {
      const res = await api.enrollFace(capturedSnapshot);

      setSuccessMsg(res.message || 'Face ID registered and enrolled successfully!');
      setTimeout(() => {
        onSuccess(res.profilePhotoUrl || res.photoUrl || capturedSnapshot, res.student);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Face enrollment failed. Please retry in clear lighting.');
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
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
              <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                Register Face ID
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                  Cloud AI
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                {studentName || 'Student'} ({registerNumber || 'ID'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#202028] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder / Capture Canvas */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center overflow-y-auto">
          {errorMsg && (
            <div className="w-full mb-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="w-full mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Viewfinder Window */}
          <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black border-2 border-zinc-200 dark:border-[#26262e] shadow-inner flex items-center justify-center">
            {capturedSnapshot ? (
              // Captured snapshot preview
              <img
                src={capturedSnapshot}
                alt="Captured Face Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              // Live camera stream
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            )}

            {/* Face Oval Framing Guide */}
            {!capturedSnapshot && isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-[190px] h-[250px] rounded-[50%] border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <div className="absolute bottom-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-white flex items-center gap-1.5">
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>{lightingFeedback}</span>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white p-4 text-center">
                <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono">{statusText || 'Processing...'}</p>
              </div>
            )}
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
              {capturedSnapshot
                ? 'Review your face photo above. Ensure clear visibility and no mask/sunglasses.'
                : 'Position your face inside the oval and click Capture.'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-[#18181f] border-t border-zinc-100 dark:border-[#202028] flex items-center justify-between gap-2">
          {capturedSnapshot ? (
            <>
              <button
                type="button"
                onClick={retakeSnapshot}
                disabled={isLoading}
                className="px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#26262e] rounded-xl transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake Photo
              </button>
              <button
                type="button"
                onClick={handleRegisterFace}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Save & Register Face ID
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                disabled={isLoading || !isCameraActive}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                Capture Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
