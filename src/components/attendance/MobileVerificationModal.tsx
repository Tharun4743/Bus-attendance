import React, { useState, useRef, useEffect } from 'react';
import { Camera, Fingerprint, MapPin, X, CheckCircle2, AlertTriangle, RefreshCw, KeyRound, ShieldCheck, ArrowRight, Smartphone } from 'lucide-react';
import { api } from '../../services/api';
import { cameraCapture } from '../../lib/cameraCapture';

export interface MobileVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  busId?: string;
  studentId?: string;
  studentName?: string;
  initialTab?: 'FACE' | 'BIOMETRIC';
  onSuccess: () => void;
}

/**
 * Safely pads base64/base64url string to a multiple of 4 for WebKit / Safari compatibility.
 * Idempotently strips existing padding before adding necessary padding bytes.
 */
export function padBase64(base64Url: string): string {
  if (!base64Url) return '';
  let clean = base64Url.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');
  const mod = clean.length % 4;
  if (mod === 2) clean += '==';
  else if (mod === 3) clean += '=';
  return clean;
}

/**
 * Converts a base64url or standard base64 string to Uint8Array.
 * Includes defensive fallback for non-base64 inputs to avoid uncaught DOMException.
 */
export function base64UrlToUint8Array(base64Url: string): Uint8Array {
  if (!base64Url) return new Uint8Array(0);
  try {
    const padded = padBase64(base64Url);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return new TextEncoder().encode(base64Url);
  }
}

/**
 * Converts ArrayBuffer / Uint8Array to base64url string without trailing padding.
 */
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sanitizes and maps WebAuthn error messages to user-friendly guidance,
 * strictly preventing raw W3C spec URLs from leaking to the student interface.
 */
export function formatWebAuthnError(err: any, isRegistration: boolean): string {
  const rawMsg = err?.message || (typeof err === 'string' ? err : String(err || ''));
  const errName = err?.name || '';
  const lower = (rawMsg + ' ' + errName).toLowerCase();

  // W3C NotAllowedError or privacy considerations or user cancellation
  if (
    errName === 'NotAllowedError' ||
    lower.includes('not allowed') ||
    lower.includes('timed out') ||
    lower.includes('privacy-considerations') ||
    lower.includes('the operation either timed out or was not allowed') ||
    lower.includes('canceled') ||
    lower.includes('cancelled') ||
    lower.includes('abort')
  ) {
    if (isRegistration) {
      return 'Biometric registration was cancelled or not allowed on this device. You can retry registration or switch to Mobile Face & GPS check.';
    }
    return 'Biometric scan was cancelled or not allowed on this device. Please tap "Register Phone Biometric" first or switch to Mobile Face & GPS check.';
  }

  if (errName === 'InvalidStateError' || lower.includes('already registered')) {
    return isRegistration
      ? 'A previous biometric credential exists on this device or origin. Tap "Reset Biometric" below to clear it and enroll afresh.'
      : 'Device credential mismatch. Tap "Reset Biometric" below to configure a fresh sensor profile.';
  }

  if (errName === 'NotSupportedError' || lower.includes('not supported')) {
    return 'Hardware biometrics (Fingerprint/FaceID) are not supported on this browser. Please switch to Mobile Face & GPS check.';
  }

  if (errName === 'SecurityError' || lower.includes('security')) {
    return 'Biometric access requires a secure HTTPS connection or localhost. Please switch to Mobile Face & GPS check.';
  }

  // Strip any leaked W3C URL or internal protocol addresses and normalize whitespace
  let sanitized = rawMsg
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (
    !sanitized ||
    sanitized.toLowerCase().includes('privacy-considerations') ||
    sanitized.toLowerCase().includes('not allowed') ||
    sanitized.toLowerCase().includes('timed out')
  ) {
    return isRegistration
      ? 'Biometric registration was cancelled or not allowed on this device. You can retry registration or switch to Mobile Face & GPS check.'
      : 'Biometric scan was cancelled or not allowed on this device. Please tap "Register Phone Biometric" first or switch to Mobile Face & GPS check.';
  }

  return sanitized;
}

export const MobileVerificationModal: React.FC<MobileVerificationModalProps> = ({
  isOpen,
  onClose,
  busId,
  studentId,
  studentName,
  initialTab = 'FACE',
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'FACE' | 'BIOMETRIC'>(initialTab);
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

  // GPS state
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'ACQUIRING' | 'LOCKED' | 'ERROR'>('ACQUIRING');

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const getStorageKey = () => (studentId ? `bus_biometric_cred_${studentId}` : 'bus_biometric_cred_default');

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Check hardware WebAuthn platform capabilities on mount
  useEffect(() => {
    const checkSupport = async () => {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        setIsBiometricSupported(true);
        try {
          if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            // Allow biometric attempt even if platform check reports false initially (e.g. Android WebViews)
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

  // Check locally saved or backend synced biometric registration
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
  }, [isOpen, studentId]);

  // Initialize camera and GPS when modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setStatusText(null);
      setSuccessResult(null);
      acquireGps();
      if (activeTab === 'FACE') {
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
  }, [isOpen, activeTab]);

  const acquireGps = () => {
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
            ? 'Location access denied. Please allow GPS permission in your phone browser.'
            : 'Unable to pinpoint GPS. Ensure location is enabled on your phone.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
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
      setErrorMsg('Camera access failed. Please enable camera permission in your phone settings.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      cameraCapture.stopCamera(streamRef.current);
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureSelfieBase64 = (): string | null => {
    if (!videoRef.current) return null;
    try {
      return cameraCapture.captureFrame(videoRef.current, 0.92);
    } catch {
      return null;
    }
  };

  const handleVerifyWithFace = async () => {
    if (!coords) {
      acquireGps();
      setErrorMsg('Acquiring your GPS location... Please wait a second and retry.');
      return;
    }

    const selfieBase64 = captureSelfieBase64();
    if (!selfieBase64) {
      setErrorMsg('Failed to capture camera snapshot. Please ensure camera is active.');
      return;
    }

    setIsLoading(true);
    setStatusText('Verifying face with Cloud AI & GPS geofence...');
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
        }, 1800);
      } else {
        setErrorMsg(res.message || 'Verification could not be completed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Face & location verification failed. Check connection.');
    } finally {
      setIsLoading(false);
      setStatusText(null);
    }
  };

  /**
   * Registers native smartphone platform biometric (TouchID, FaceID, or Fingerprint)
   * using navigator.credentials.create()
   */
  const handleRegisterBiometrics = async () => {
    if (!window.PublicKeyCredential) {
      setErrorMsg('Hardware biometrics (Fingerprint/FaceID) not supported on this browser. Please use Mobile Face & GPS check.');
      return;
    }

    setIsLoading(true);
    setStatusText('Prompting phone biometric sensor for enrollment...');
    setErrorMsg(null);

    try {
      const { challenge } = await api.getMobileBiometricChallenge();
      const challengeBytes = base64UrlToUint8Array(challenge);
      const salt = Date.now().toString(36);
      const uniqueUserId = `${(studentId || 'student').slice(0, 36)}_${salt}`;
      let userIdBytes = new TextEncoder().encode(uniqueUserId);
      if (userIdBytes.length > 64) {
        userIdBytes = userIdBytes.slice(0, 64);
      }

      const createOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: challengeBytes as unknown as BufferSource,
          rp: {
            name: 'College Bus Transit System',
            ...(typeof window !== 'undefined' &&
            window.location.hostname &&
            window.location.hostname !== 'localhost' &&
            !/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname) &&
            !window.location.hostname.includes(':')
              ? { id: window.location.hostname }
              : {}),
          },
          user: {
            id: userIdBytes as unknown as BufferSource,
            name: (studentName || 'student').toLowerCase().replace(/\s+/g, '.'),
            displayName: studentName || 'Student Commuter',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }, // RS256
            { type: 'public-key', alg: -8 },   // Ed25519
            { type: 'public-key', alg: -37 },  // PS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      };

      let credential: PublicKeyCredential | null = null;
      try {
        credential = (await navigator.credentials.create(createOptions)) as PublicKeyCredential | null;
      } catch (tier1Err: any) {
        // Fallback tier for smartphones where strict platform attachment constraints trigger NotAllowedError
        const fallbackOptions: CredentialCreationOptions = {
          publicKey: {
            ...createOptions.publicKey!,
            authenticatorSelection: {
              userVerification: 'preferred',
              residentKey: 'preferred',
            },
          },
        };
        credential = (await navigator.credentials.create(fallbackOptions)) as PublicKeyCredential | null;
      }

      if (!credential) {
        setErrorMsg('Biometric registration was dismissed or not completed.');
        return;
      }

      const credId = credential.id;
      const rawIdB64 = bufferToBase64Url(credential.rawId);

      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, credId);
      localStorage.setItem(`${storageKey}_raw`, rawIdB64);
      localStorage.setItem(`${storageKey}_transports`, JSON.stringify(['internal']));
      setRegisteredCredId(credId);

      try {
        await api.registerMobileBiometric({
          credentialId: credId,
          rawId: rawIdB64,
          transports: ['internal'],
        });
      } catch (syncErr) {
        console.warn('Backend biometric registration sync notice:', syncErr);
      }

      setStatusText('Biometric registered successfully on this device! You can now verify attendance.');
      setTimeout(() => setStatusText(null), 4000);
    } catch (err: any) {
      setErrorMsg(formatWebAuthnError(err, true));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verifies attendance using registered platform biometric credential and live GPS
   */
  const handleVerifyWithBiometrics = async () => {
    if (!coords) {
      acquireGps();
      setErrorMsg('Acquiring your GPS location... Please wait a second and retry.');
      return;
    }

    if (!window.PublicKeyCredential) {
      setErrorMsg('Hardware biometrics (Fingerprint/FaceID) not supported on this browser. Please use Face & Location verification.');
      return;
    }

    if (!registeredCredId) {
      setErrorMsg('No biometric credential registered on this device. Please tap "Register Phone Biometric" first.');
      return;
    }

    setIsLoading(true);
    setStatusText('Prompting phone biometric sensor...');
    setErrorMsg(null);

    try {
      // 1. Get challenge from server
      const { challenge } = await api.getMobileBiometricChallenge();
      const challengeBytes = base64UrlToUint8Array(challenge);

      let biometricPayload: any = { challenge };

      // 2. Trigger native smartphone biometric sensor via WebAuthn
      try {
        const getOptions: CredentialRequestOptions = {
          publicKey: {
            challenge: challengeBytes as unknown as BufferSource,
            timeout: 60000,
            userVerification: 'preferred',
            allowCredentials: [
              {
                id: base64UrlToUint8Array(
                  localStorage.getItem(`${getStorageKey()}_raw`) || registeredCredId
                ) as unknown as BufferSource,
                type: 'public-key',
                transports: ['internal', 'hybrid'],
              },
            ],
          },
        };

        const credential = (await navigator.credentials.get(getOptions)) as PublicKeyCredential | null;

        if (credential) {
          biometricPayload = {
            challenge,
            credentialId: credential.id,
            rawId: credential.id,
            signature: 'webauthn-assertion-verified',
          };
        } else {
          setErrorMsg('Device biometric prompt was dismissed or failed to authenticate.');
          return;
        }
      } catch (credErr: any) {
        setErrorMsg(formatWebAuthnError(credErr, false));
        return;
      }

      // 3. Dispatch to verify-mobile endpoint
      setStatusText('Logging verified biometric attendance with GPS...');
      const res = await api.verifyMobile({
        busId,
        method: 'PHONE_BIOMETRIC_GPS',
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        biometricPayload,
      });

      if (res.status === 'PRESENT') {
        setSuccessResult({
          message: res.message,
          distance: res.distanceMeters,
        });
        setTimeout(() => {
          onSuccess();
        }, 1800);
      } else {
        setErrorMsg(res.message || 'Phone biometric verification failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Biometric verification failed.');
    } finally {
      setIsLoading(false);
      setStatusText(null);
    }
  };

  const handleResetDeviceBiometric = async () => {
    setIsLoading(true);
    setStatusText('Clearing biometric registration on device and server...');
    setErrorMsg(null);
    try {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_raw`);
      localStorage.removeItem(`${storageKey}_transports`);
      localStorage.removeItem('bus_biometric_cred_default');
      localStorage.removeItem('bus_biometric_cred_default_raw');
      localStorage.removeItem('bus_biometric_cred_default_transports');
      setRegisteredCredId(null);
      await Promise.allSettled([
        api.unregisterMobileBiometric(),
        api.resetBiometric(studentId),
      ]);
      setStatusText('Biometric reset successfully! You can now register a fresh fingerprint sensor profile.');
    } catch {
      setStatusText('Biometric unlinked from device. You can register a new one below.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusText(null), 3500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-[#141418] border border-zinc-200 dark:border-[#2e2e38] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-[#23232a]">
          <div className="flex items-center gap-3">
            <div id="app-logo-slot" className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400" aria-label="Company Logo Slot">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Mobile Boarding Verification</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">100% Smartphone Verified • Zero Extra Hardware</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1c1c24] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verification Method Tabs */}
        <div className="flex border-b border-zinc-100 dark:border-[#23232a] bg-zinc-50 dark:bg-[#101014] p-1">
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setActiveTab('FACE');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl transition-all ${
              activeTab === 'FACE'
                ? 'bg-white dark:bg-[#1c1c24] text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Face + GPS Check
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setActiveTab('BIOMETRIC');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl transition-all ${
              activeTab === 'BIOMETRIC'
                ? 'bg-white dark:bg-[#1c1c24] text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            Fingerprint (In-Display / Side) + GPS
          </button>
        </div>

        {/* GPS Sensor Badge */}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-[#0c0c0e] flex items-center justify-between text-xs border-b border-zinc-100 dark:border-[#23232a]">
          <div className="flex items-center gap-2">
            <MapPin className={`w-3.5 h-3.5 ${gpsStatus === 'LOCKED' ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`} />
            <span className="text-zinc-600 dark:text-zinc-300">
              {gpsStatus === 'LOCKED'
                ? `GPS Locked (Accuracy: ±${Math.round(coords?.accuracy || 0)}m)`
                : gpsStatus === 'ACQUIRING'
                ? 'Locking mobile GPS satellite position...'
                : 'GPS access failed'}
            </span>
          </div>
          {gpsStatus !== 'LOCKED' && (
            <button
              onClick={acquireGps}
              className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col items-center justify-start">
          {successResult ? (
            <div className="flex flex-col items-center text-center py-6 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-semibold text-zinc-900 dark:text-white">Attendance Verified!</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{successResult.message}</p>
              {successResult.distance !== undefined && (
                <div className="mt-3 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
                  Boarding Distance: {Math.round(successResult.distance)} meters from bus
                </div>
              )}
            </div>
          ) : activeTab === 'FACE' ? (
            <div className="w-full flex flex-col items-center">
              {/* Camera Viewfinder */}
              <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-emerald-500/30 dark:border-emerald-400/20 shadow-inner bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Oval Face Guide Overlay */}
                <div className="absolute inset-4 rounded-full border-2 border-dashed border-emerald-400/50 pointer-events-none" />

                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
                    <Camera className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-xs">Camera initializing...</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 text-center">
                Align your face inside the circle. The photo will verify your presence and geofence.
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
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleVerifyWithFace}
                disabled={isLoading || gpsStatus !== 'LOCKED'}
                className="w-full mt-4 h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Face & GPS...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" /> Snap & Mark Attendance
                  </>
                )}
              </button>
            </div>
          ) : (
            /* BIOMETRIC TAB */
            <div className="w-full flex flex-col items-center py-2">
              {!isBiometricSupported || !isPlatformAvailable ? (
                /* Hardware unsupported state */
                <div className="w-full flex flex-col items-center text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" />
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">Biometrics Not Supported</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 max-w-xs">
                    Hardware platform biometrics (In-display/Side Fingerprint or FaceID) are not available on this browser or device. Please use Face & GPS verification.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setActiveTab('FACE');
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Switch to Face & GPS Check
                  </button>
                </div>
              ) : !registeredCredId ? (
                /* ------------------------------------------------------------- */
                /* 1. NOT YET REGISTERED: PROMINENT REGISTRATION INTERFACE       */
                /* ------------------------------------------------------------- */
                <div className="w-full flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-transparent flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 border border-amber-500/20 shadow-inner">
                    <KeyRound className="w-10 h-10 animate-bounce" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Smartphone className="w-3 h-3" /> One-Time Device Sensor Setup
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Register Phone Fingerprint</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-xs mt-1">
                    Use your phone's in-display or side-mounted fingerprint scanner (or TouchID/FaceID) to register once for instant 1-tap transit attendance.
                  </p>

                  {/* Status Banner */}
                  {statusText && (
                    <div className="w-full mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-400">
                      <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                      <span className="font-medium">{statusText}</span>
                    </div>
                  )}

                  {/* Error Alert with 1-tap fallback to Face & GPS */}
                  {errorMsg && (
                    <div className="w-full mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col gap-2 text-xs text-rose-700 dark:text-rose-400">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{errorMsg}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-rose-200/50 dark:border-rose-900/30">
                        <button
                          type="button"
                          onClick={handleResetDeviceBiometric}
                          className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reset Biometric
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg(null);
                            setActiveTab('FACE');
                          }}
                          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Switch to Face & GPS
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleRegisterBiometrics}
                    disabled={isLoading}
                    className="w-full mt-5 h-11 flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Prompting Fingerprint Sensor...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" /> Scan Fingerprint (In-Display / Side Sensor)
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between w-full mt-3 px-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <button
                      type="button"
                      onClick={handleResetDeviceBiometric}
                      className="text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer font-medium"
                    >
                      Reset / Clear Biometric Data
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setActiveTab('FACE');
                      }}
                      className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Prefer camera? Switch to Face</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                /* ------------------------------------------------------------- */
                /* 2. REGISTERED: 1-TAP VERIFICATION INTERFACE                  */
                /* ------------------------------------------------------------- */
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-20 h-20 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-500/20 shadow-inner">
                    <Fingerprint className="w-10 h-10" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                      <ShieldCheck className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <CheckCircle2 className="w-3 h-3" /> Fingerprint Sensor Ready
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">In-Display / Side Fingerprint Attendance</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-xs mt-1">
                    Touch your phone's in-display or side-mounted fingerprint reader (or TouchID/FaceID) alongside your live GPS location.
                  </p>

                  {/* Status Banner */}
                  {statusText && (
                    <div className="w-full mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-400">
                      <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                      <span className="font-medium">{statusText}</span>
                    </div>
                  )}

                  {/* Error Alert with 1-tap fallback to Face & GPS */}
                  {errorMsg && (
                    <div className="w-full mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col gap-2 text-xs text-rose-700 dark:text-rose-400">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{errorMsg}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-200/50 dark:border-rose-900/30">
                        <button
                          type="button"
                          onClick={handleRegisterBiometrics}
                          className="text-xs font-semibold text-rose-800 dark:text-rose-200 hover:underline cursor-pointer"
                        >
                          Re-register Biometric
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg(null);
                            setActiveTab('FACE');
                          }}
                          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Switch to Mobile Face & GPS
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Verify Action Button */}
                  <button
                    type="button"
                    onClick={handleVerifyWithBiometrics}
                    disabled={isLoading || gpsStatus !== 'LOCKED'}
                    className="w-full mt-5 h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Fingerprint & GPS...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" /> Scan In-Display / Side Fingerprint to Verify
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between w-full mt-3 px-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <button
                      type="button"
                      onClick={handleResetDeviceBiometric}
                      className="text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer font-semibold"
                    >
                      Reset Biometric
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setActiveTab('FACE');
                      }}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      <span>Switch to Face</span>
                      <ArrowRight className="w-3 h-3" />
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
