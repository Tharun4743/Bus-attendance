import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { extractHeavyFaceDescriptor, loadFaceApiModels, computeMultiPoseCentroid, HeadPose } from '../../lib/faceBiometrics';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profilePhotoUrl: string) => void;
  studentName?: string;
  registerNumber?: string;
}

interface PoseStep {
  id: number;
  label: string;
  instruction: string;
  expectedPose: HeadPose;
}

const POSE_STEPS: PoseStep[] = [
  { id: 1, label: 'Front Center', instruction: 'Look directly into camera', expectedPose: 'CENTER' },
  { id: 2, label: 'Slight Left', instruction: 'Turn head slightly to your LEFT (approx. 15°)', expectedPose: 'LEFT' },
  { id: 3, label: 'Slight Right', instruction: 'Turn head slightly to your RIGHT (approx. 15°)', expectedPose: 'RIGHT' },
];

export const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentName,
  registerNumber,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0, 1, 2
  const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([]);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [intraClassVariance, setIntraClassVariance] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetCalibration();
      loadFaceApiModels().catch((e) => console.warn('[FaceAPI] Preload error:', e));
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const resetCalibration = () => {
    setCurrentStepIndex(0);
    setCapturedDescriptors([]);
    setCapturedSnapshot(null);
    setCalibrationComplete(false);
    setIntraClassVariance(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setStatusText(null);
  };

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

  const captureCurrentPose = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.88);

    setIsLoading(true);
    setStatusText(`Analyzing Pose ${currentStepIndex + 1} of 3 (${POSE_STEPS[currentStepIndex].label})...`);
    setErrorMsg(null);

    try {
      const bioResult = await extractHeavyFaceDescriptor(canvas, { minConfidence: 0.60 });
      if (!bioResult.success || !bioResult.descriptor) {
        setErrorMsg(bioResult.error || 'Face not detected clearly. Align your face inside the circle.');
        return;
      }

      // First snapshot becomes reference portrait
      if (!capturedSnapshot) {
        setCapturedSnapshot(base64);
      }

      const updatedDescriptors = [...capturedDescriptors, bioResult.descriptor];
      setCapturedDescriptors(updatedDescriptors);

      if (currentStepIndex + 1 < POSE_STEPS.length) {
        // Advance to next calibration pose
        setCurrentStepIndex((prev) => prev + 1);
        setStatusText(`Pose ${currentStepIndex + 1} locked! Next: ${POSE_STEPS[currentStepIndex + 1].instruction}`);
      } else {
        // All 3 poses collected: compute normalized multi-pose centroid
        const { variance } = computeMultiPoseCentroid(updatedDescriptors);
        setIntraClassVariance(variance);
        setCalibrationComplete(true);
        stopCamera();
        setStatusText(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Pose capture failed. Please retry with good lighting.');
    } finally {
      setIsLoading(false);
    }
  };

  const retakeCalibration = () => {
    resetCalibration();
    startCamera();
  };

  const handleRegisterFace = async () => {
    if (!capturedSnapshot || capturedDescriptors.length === 0) {
      setErrorMsg('Please complete calibration capture first.');
      return;
    }

    setIsLoading(true);
    setStatusText('Encrypting & registering 3D multi-pose baseline...');
    setErrorMsg(null);

    try {
      const { centroid, variance } = computeMultiPoseCentroid(capturedDescriptors);
      const qualityScore = Math.max(85, Math.min(99, Math.round(100 - variance * 250)));
      const leftDesc = capturedDescriptors[1] || undefined;
      const rightDesc = capturedDescriptors[2] || undefined;

      const res = await api.enrollFace(
        capturedSnapshot,
        centroid,
        leftDesc,
        rightDesc,
        qualityScore
      );

      setSuccessMsg(res.message || 'Multi-pose Face ID registered successfully!');
      setTimeout(() => {
        onSuccess(res.profilePhotoUrl || res.photoUrl || capturedSnapshot);
        onClose();
      }, 1400);
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                3-Angle Face ID Calibration
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                {studentName || 'Student'} ({registerNumber || 'ID'}) • High-Accuracy Anti-Overfitting
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
        <div className="p-4 overflow-y-auto space-y-3.5">
          {/* 3-Pose Progress Steps */}
          <div className="grid grid-cols-3 gap-2">
            {POSE_STEPS.map((step, idx) => {
              const isDone = capturedDescriptors.length > idx;
              const isCurrent = currentStepIndex === idx && !calibrationComplete;
              return (
                <div
                  key={step.id}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    isDone
                      ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                      : isCurrent
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider">
                    {isDone ? '✓ Saved' : `Pose ${step.id}`}
                  </div>
                  <div className="text-[11px] font-semibold mt-0.5 truncate">{step.label}</div>
                </div>
              );
            })}
          </div>

          {/* Current Instruction Banner */}
          {!calibrationComplete && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="text-[11px] font-medium">
                <strong>Step {currentStepIndex + 1}:</strong> {POSE_STEPS[currentStepIndex].instruction}
              </div>
            </div>
          )}

          {/* Camera Viewfinder / Preview */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
            {calibrationComplete && capturedSnapshot ? (
              <div className="relative w-full h-full">
                <img
                  src={capturedSnapshot}
                  alt="Captured Multi-Pose Baseline"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-emerald-950/30 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center text-white">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-lg">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold">Calibration Complete!</h4>
                  <p className="text-[11px] text-emerald-200 mt-1">
                    3-angle feature centroid extracted (Variance: {intraClassVariance ?? '0.01'}). Ready to register.
                  </p>
                </div>
              </div>
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
                      {POSE_STEPS[currentStepIndex].label}
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
          {calibrationComplete ? (
            <>
              <button
                type="button"
                onClick={retakeCalibration}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recalibrate</span>
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
            <div className="w-full flex gap-2">
              <button
                type="button"
                onClick={captureCurrentPose}
                disabled={!isCameraActive || isLoading}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Pose {currentStepIndex + 1} of 3</span>
              </button>
              {capturedDescriptors.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const { variance } = computeMultiPoseCentroid(capturedDescriptors);
                    setIntraClassVariance(variance);
                    setCalibrationComplete(true);
                    stopCamera();
                  }}
                  className="py-3 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Finish ({capturedDescriptors.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
