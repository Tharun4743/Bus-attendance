import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Fingerprint,
  MapPin,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import { api } from '../../services/api';
import { cameraCapture } from '../../lib/cameraCapture';
import { formatWebAuthnError } from '../../lib/webauthn';
import { Select } from '../ui/Select';

export { formatWebAuthnError };
export type VerificationMethod = '' | 'FACE_GPS' | 'FINGERPRINT_GPS';

export interface MobileVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  busId?: string;
  studentId?: string;
  studentName?: string;
  initialMethod?: VerificationMethod;
  initialTab?: 'FACE' | 'BIOMETRIC';
  onSuccess: () => void;
}

export const MobileVerificationModal: React.FC<MobileVerificationModalProps> = ({
  isOpen,
  onClose,
  busId,
  studentId,
  studentName: _studentName,
  initialMethod = '',
  initialTab,
  onSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod>(
    initialMethod || (initialTab === 'FACE' ? 'FACE_GPS' : initialTab === 'BIOMETRIC' ? 'FINGERPRINT_GPS' : '')
  );
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    distance?: number;
    faceConfidence?: number;
    selfieUrl?: string;
  } | null>(null);

  // Biometric device enrollment state
  const [registeredCredId, setRegisteredCredId] = useState<string | null>(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(true);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState<boolean>(true);

  // Unified GPS state
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'ACQUIRING' | 'LOCKED' | 'ERROR'>('ACQUIRING');

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const getStorageKey = useCallback(
    () => (studentId ? `bus_biometric_cred_${studentId}` : 'bus_biometric_cred_default'),
    [studentId]
  );

  // Sync initialMethod or initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialMethod) {
        setSelectedMethod(initialMethod);
      } else if (initialTab === 'FACE') {
        setSelectedMethod('FACE_GPS');
      } else if (initialTab === 'BIOMETRIC') {
        setSelectedMethod('FINGERPRINT_GPS');
      }
    }
  }, [isOpen, initialMethod, initialTab]);

  // Hardware WebAuthn platform capability detection
  useEffect(() => {
    const checkSupport = async () => {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        setIsBiometricSupported(true);
        try {
          if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            setIsPlatformAvailable(available !== false || Boolean(window.PublicKeyCredential));
          } else {
            setIsPlatformAvailable(true);
          }
        } catch {
          setIsPlatformAvailable(true);
        }
      } else {
        setIsBiometricSupported(false);
        setIsPlatformAvailable(false);
      }
    };
    checkSupport();
  }, []);

  // Fetch biometric credential state from localStorage or backend
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        setRegisteredCredId(stored);
      } else {
        api.getMobileBiometricCredential().then((res) => {
          if (res.credential?.credentialId) {
            localStorage.setItem(getStorageKey(), res.credential.credentialId);
            setRegisteredCredId(res.credential.credentialId);
          }
        }).catch(() => {});
      }
    }
  }, [isOpen, getStorageKey]);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      cameraCapture.stopCamera(streamRef.current);
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start camera helper
  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      if (!videoRef.current) return;
      const stream = await cameraCapture.startCamera(videoRef.current, 'user');
      streamRef.current = stream;
      setIsCameraActive(true);
      setErrorMsg(null);
    } catch {
      setIsCameraActive(false);
      setErrorMsg('Camera access denied. Please allow camera permissions in your mobile browser.');
    }
  }, [stopCamera]);

  // Unified GPS acquisition service with independent retry
  const acquireGps = useCallback(() => {
    setGpsStatus('ACQUIRING');
    if (!navigator.geolocation) {
      setGpsStatus('ERROR');
      setErrorMsg('Geolocation is not supported by your mobile browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsStatus('LOCKED');
      },
      (err) => {
        setGpsStatus('ERROR');
        setErrorMsg(
          err.code === 1
            ? 'Location permission denied. Please allow GPS access in your browser settings.'
            : 'Unable to pinpoint GPS coordinates. Please ensure device location is enabled.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // Handle method change and lifecycle
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setStatusText(null);
      setSuccessResult(null);
      acquireGps();

      if (selectedMethod === 'FACE_GPS') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, selectedMethod, acquireGps, startCamera, stopCamera]);

  const captureSelfieBase64 = (): string | null => {
    if (!videoRef.current) return null;
    try {
      return cameraCapture.captureFrame(videoRef.current, 0.92);
    } catch {
      return null;
    }
  };

  // Method A: Face + GPS Handler
  const handleVerifyWithFace = async () => {
    if (!coords) {
      acquireGps();
      setErrorMsg('Acquiring GPS location. Please wait a moment and tap verify again.');
      return;
    }

    const selfieBase64 = captureSelfieBase64();
    if (!selfieBase64) {
      setErrorMsg('Unable to capture camera snapshot. Please ensure camera is active.');
      return;
    }

    setIsLoading(true);
    setStatusText('Verifying face and GPS geofence...');
    setErrorMsg(null);

    try {
      const res = await api.verifyMobile({
        busId,
        method: 'FACE_GPS',
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        selfieBase64,
      });

      if (res.status === 'PRESENT') {
        setSuccessResult({
          message: res.message,
          distance: res.distanceMeters,
          faceConfidence: res.faceConfidence,
          selfieUrl: res.selfieUrl,
        });
        stopCamera();
        setTimeout(() => {
          onSuccess();
        }, 1600);
      } else {
        setErrorMsg(res.message || 'Verification could not be completed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Face and GPS verification failed. Please check connection and retry.');
    } finally {
      setIsLoading(false);
      setStatusText(null);
    }
  };

  // Method B: Fingerprint Registration (One-time setup)
  const handleRegisterFingerprint = async () => {
    if (!browserSupportsWebAuthn()) {
      setErrorMsg('Hardware biometrics are not supported on this browser. Please use Face + GPS.');
      return;
    }

    const hasPlatform = await platformAuthenticatorIsAvailable();
    if (!hasPlatform) {
      setErrorMsg('No physical fingerprint scanner detected. Ensure a fingerprint is enrolled in Android Settings, or use Face + GPS.');
      return;
    }

    setIsLoading(true);
    setStatusText('Touch your phone’s fingerprint sensor...');
    setErrorMsg(null);

    try {
      // 1. Fetch server registration options with residentKey: "preferred" & supportedAlgorithmIDs: [-7, -257]
      const optionsJSON = await api.getMobileRegistrationOptions();

      // 2. Invoke Android platform authenticator
      const registrationResponse = await startRegistration({ optionsJSON });

      // 3. Cryptographically verify attestation on backend
      setStatusText('Confirming fingerprint registration on server...');
      const verifyRes = await api.verifyMobileRegistration(registrationResponse);

      if (verifyRes.verified) {
        const credId = verifyRes.credentialId;
        const storageKey = getStorageKey();
        localStorage.setItem(storageKey, credId);
        setRegisteredCredId(credId);
        setStatusText('Fingerprint registered successfully.');
        setTimeout(() => setStatusText(null), 3000);
      } else {
        setErrorMsg('Fingerprint registration rejected by server. Please try again.');
      }
    } catch (err: any) {
      console.error('Fingerprint registration error:', err);
      setErrorMsg(formatWebAuthnError(err, true));
    } finally {
      setIsLoading(false);
    }
  };

  // Method B: Fingerprint + GPS Verification (Subsequent attendance)
  const handleVerifyWithFingerprint = async () => {
    if (!coords) {
      acquireGps();
      setErrorMsg('Acquiring GPS location. Please wait a moment and tap verify again.');
      return;
    }

    if (!browserSupportsWebAuthn()) {
      setErrorMsg('Hardware biometrics are not supported on this browser. Please switch to Face + GPS.');
      return;
    }

    setIsLoading(true);
    setStatusText('Touch your phone’s fingerprint sensor...');
    setErrorMsg(null);

    try {
      // 1. Fetch server authentication options
      const optionsJSON = await api.getMobileAuthenticationOptions();

      // 2. Invoke native Android platform biometric prompt
      const authResponse = await startAuthentication({ optionsJSON });

      // 3. Dispatch assertion and GPS coordinates to backend
      setStatusText('Validating fingerprint signature and GPS boundary...');
      const res = await api.verifyMobile({
        busId,
        method: 'PHONE_BIOMETRIC_GPS',
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        biometricPayload: { response: authResponse },
      });

      if (res.status === 'PRESENT') {
        setSuccessResult({
          message: res.message,
          distance: res.distanceMeters,
        });
        setTimeout(() => {
          onSuccess();
        }, 1600);
      } else {
        setErrorMsg(res.message || 'Fingerprint verification could not be completed.');
      }
    } catch (err: any) {
      console.error('Fingerprint verification error:', err);
      setErrorMsg(formatWebAuthnError(err, false));
    } finally {
      setIsLoading(false);
      setStatusText(null);
    }
  };

  // Method B: Reset Sensor Profile
  const handleResetDeviceBiometric = async () => {
    setIsLoading(true);
    setStatusText('Clearing fingerprint profile from device and server...');
    setErrorMsg(null);
    try {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
      localStorage.removeItem('bus_biometric_cred_default');
      setRegisteredCredId(null);
      await Promise.allSettled([
        api.unregisterMobileBiometric(),
        api.resetBiometric(studentId),
      ]);
      setStatusText('Fingerprint sensor reset. You can now register a fresh profile.');
    } catch {
      setStatusText('Sensor profile cleared locally. You can register a fresh profile.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusText(null), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-[#141418] border border-zinc-200 dark:border-[#2e2e38] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header: Display ONLY "Mobile Boarding Verification" */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-[#23232a]">
          <div className="flex items-center gap-3">
            <div
              id="app-logo-slot"
              className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400"
              aria-label="Company Logo Slot"
            >
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Mobile Boarding Verification</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Institutional Transit Check-In</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1c1c24] transition-colors cursor-pointer"
            aria-label="Close Verification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selection: Standardized Dropdown defaulting to "Select an option" */}
        <div className="p-4 border-b border-zinc-100 dark:border-[#23232a] bg-zinc-50/50 dark:bg-[#101014]">
          <Select
            label="Verification Method"
            placeholder="Select an option"
            value={selectedMethod}
            onChange={(e) => {
              setErrorMsg(null);
              setStatusText(null);
              setSelectedMethod(e.target.value as VerificationMethod);
            }}
            options={[
              { value: 'FACE_GPS', label: 'Face + GPS' },
              { value: 'FINGERPRINT_GPS', label: 'Fingerprint + GPS' },
            ]}
          />
        </div>

        {/* Unified GPS Status Sensor Bar (Visible whenever a method is chosen) */}
        {selectedMethod && (
          <div className="px-4 py-2.5 bg-zinc-50 dark:bg-[#0c0c0e] flex items-center justify-between text-xs border-b border-zinc-100 dark:border-[#23232a]">
            <div className="flex items-center gap-2">
              <MapPin
                className={`w-3.5 h-3.5 ${
                  gpsStatus === 'LOCKED' ? 'text-emerald-500' : 'text-amber-500 animate-pulse'
                }`}
              />
              <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                {gpsStatus === 'LOCKED'
                  ? `GPS Locked (Accuracy: ±${Math.round(coords?.accuracy || 0)}m)`
                  : gpsStatus === 'ACQUIRING'
                  ? 'Acquiring device GPS position...'
                  : 'GPS position unavailable'}
              </span>
            </div>
            {gpsStatus !== 'LOCKED' && (
              <button
                type="button"
                onClick={acquireGps}
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry GPS
              </button>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col items-center justify-start">
          {successResult ? (
            /* Success Confirmation Screen */
            <div className="flex flex-col items-center text-center py-6 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-semibold text-zinc-900 dark:text-white">Attendance Verified!</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{successResult.message}</p>
              {successResult.distance !== undefined && (
                <div className="mt-3 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
                  Boarding Distance: {Math.round(successResult.distance)}m from bus
                </div>
              )}
            </div>
          ) : !selectedMethod ? (
            /* Empty State: Prompting User to Select a Method */
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#1a1a22] flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-3 border border-zinc-200 dark:border-zinc-800">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Select Verification Method</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
                Please select either Face + GPS or Fingerprint + GPS from the dropdown above to mark your transit attendance.
              </p>
            </div>
          ) : selectedMethod === 'FACE_GPS' ? (
            /* =============================================================== */
            /* METHOD A: FACE + GPS                                            */
            /* =============================================================== */
            <div className="w-full flex flex-col items-center">
              {/* Camera Viewfinder */}
              <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-emerald-500/30 dark:border-emerald-400/20 shadow-inner bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <div className="absolute inset-4 rounded-full border-2 border-dashed border-emerald-400/50 pointer-events-none" />

                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
                    <Camera className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-xs">Initializing camera...</span>
                  </div>
                )}
              </div>

              {/* Status Banner */}
              {statusText && (
                <div className="w-full mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-400">
                  <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                  <span className="font-medium">{statusText}</span>
                </div>
              )}

              {/* Error Alert with Camera Retry */}
              {errorMsg && (
                <div className="w-full mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col gap-2 text-xs text-rose-700 dark:text-rose-400">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{errorMsg}</span>
                  </div>
                  {!isCameraActive && (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="self-end text-xs font-semibold text-rose-800 dark:text-rose-200 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry Camera
                    </button>
                  )}
                </div>
              )}

              {/* Face Action Button */}
              <button
                type="button"
                onClick={handleVerifyWithFace}
                disabled={isLoading || gpsStatus !== 'LOCKED' || !isCameraActive}
                className="w-full mt-4 h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Face & GPS...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" /> Verify Face & GPS
                  </>
                )}
              </button>
            </div>
          ) : (
            /* =============================================================== */
            /* METHOD B: FINGERPRINT + GPS                                     */
            /* =============================================================== */
            <div className="w-full flex flex-col items-center py-2">
              {!isBiometricSupported || !isPlatformAvailable ? (
                /* Hardware Unsupported View */
                <div className="w-full flex flex-col items-center text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" />
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">Biometrics Not Supported</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 max-w-xs">
                    Platform fingerprint sensor is not available on this browser. Please select Face + GPS from the dropdown above.
                  </p>
                </div>
              ) : !registeredCredId ? (
                /* Case 1: NOT REGISTERED — One-time fingerprint setup */
                <div className="w-full flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 border border-amber-500/20">
                    <KeyRound className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Register Phone Fingerprint</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-xs mt-1">
                    Touch your phone’s in-display or side fingerprint sensor once to register for instant attendance verification.
                  </p>

                  {/* Status Banner */}
                  {statusText && (
                    <div className="w-full mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-400">
                      <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                      <span className="font-medium">{statusText}</span>
                    </div>
                  )}

                  {/* Error Alert */}
                  {errorMsg && (
                    <div className="w-full mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMsg}</span>
                    </div>
                  )}

                  {/* Single Clean Register Button */}
                  <button
                    type="button"
                    onClick={handleRegisterFingerprint}
                    disabled={isLoading}
                    className="w-full mt-4 h-11 flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Prompting Fingerprint Sensor...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" /> Register Fingerprint
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Case 2: REGISTERED — Instant 1-Touch Fingerprint Verification */
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-500/20">
                    <Fingerprint className="w-8 h-8" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                      <ShieldCheck className="w-3 h-3" />
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Fingerprint Ready</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-xs mt-1">
                    Touch your phone’s fingerprint reader to verify transit attendance with live GPS.
                  </p>

                  {/* Status Banner */}
                  {statusText && (
                    <div className="w-full mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-400">
                      <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                      <span className="font-medium">{statusText}</span>
                    </div>
                  )}

                  {/* Error Alert */}
                  {errorMsg && (
                    <div className="w-full mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col gap-2 text-xs text-rose-700 dark:text-rose-400">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{errorMsg}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-rose-200/50 dark:border-rose-900/30">
                        <button
                          type="button"
                          onClick={handleResetDeviceBiometric}
                          className="text-xs font-semibold text-rose-800 dark:text-rose-200 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Reset Sensor Profile
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Verify Action Button */}
                  <button
                    type="button"
                    onClick={handleVerifyWithFingerprint}
                    disabled={isLoading || gpsStatus !== 'LOCKED'}
                    className="w-full mt-4 h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Fingerprint & GPS...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" /> Verify Fingerprint & GPS
                      </>
                    )}
                  </button>

                  {/* Reset Sensor Profile Action */}
                  <div className="flex items-center justify-center w-full mt-3">
                    <button
                      type="button"
                      onClick={handleResetDeviceBiometric}
                      className="text-xs text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:underline cursor-pointer font-medium"
                    >
                      Reset Sensor Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
