import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import {
  Bus as BusIcon,
  User as UserIcon,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Hash,
  Mail,
  Phone,
  RefreshCw,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const SignupPage: React.FC = () => {
  // Step 1 Form States
  const [name, setName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 OTP States
  const [step, setStep] = useState<'DETAILS' | 'OTP' | 'SUCCESS'>('DETAILS');
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(600); // 10 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState(60);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // OTP Countdown Timers
  useEffect(() => {
    let interval: any;
    if (step === 'OTP' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  useEffect(() => {
    let interval: any;
    if (step === 'OTP' && resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendCooldown]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedName = name.trim();
    const cleanReg = registerNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!trimmedName || !cleanReg || !cleanEmail || !password || !confirmPassword) {
      setError('Please fill in all mandatory fields (Name, Register Number, Real Email, Password).');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid real email address for verification.');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.requestOtp({
        name: trimmedName,
        registerNumber: cleanReg,
        email: cleanEmail,
        phone: phone.trim(),
        password,
      });

      setInfoMessage(res.message || `Verification code sent to ${cleanEmail}`);
      setStep('OTP');
      setOtpTimer(600);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.trim().length !== 6) {
      setError('Please enter the full 6-digit code received in your email.');
      return;
    }

    setIsLoading(true);

    try {
      await api.verifyOtp(email.trim().toLowerCase(), otp.trim());
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.requestOtp({
        name: name.trim(),
        registerNumber: registerNumber.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });

      setInfoMessage(res.message || 'A fresh verification code has been dispatched.');
      setOtpTimer(600);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'SUCCESS') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b0e] flex flex-col justify-center py-8 sm:py-12 px-4 transition-colors relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div id="app-logo-slot" className="logo-container mx-auto mb-3 empty:hidden" aria-label="Company Logo Slot"></div>
          <div className="bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.7),0_0_0_1px_#26262e] text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-[#fde047] flex items-center justify-center border border-amber-200 dark:border-amber-500/30 shadow-xs">
              <Clock className="w-7 h-7" />
            </div>

            <div>
              <Badge variant="amber" className="mb-2">
                STATUS: PENDING APPROVAL
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white mt-1">
                Registration Submitted
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Your email has been verified via Brevo OTP! Your commuter profile has been submitted for transport administrator review and bus route assignment.
              </p>
            </div>

            <div className="bg-zinc-50 dark:bg-[#1a1a20] p-4 rounded-xl border border-zinc-200/80 dark:border-[#26262e] text-xs text-left space-y-2 font-mono">
              <div className="flex justify-between border-b border-zinc-200 dark:border-[#26262e] pb-1.5 font-sans">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Full Name:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{name}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 dark:border-[#26262e] pb-1.5 font-sans">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Register Number:</span>
                <span className="font-bold text-blue-600 dark:text-sky-400 font-mono">{registerNumber.toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 dark:border-[#26262e] pb-1.5 font-sans">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Verified Email:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{email.toLowerCase()}</span>
              </div>
              <div className="flex justify-between font-sans pt-0.5">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Login Username:</span>
                <span className="font-bold text-zinc-900 dark:text-white font-mono">{registerNumber.toUpperCase()}</span>
              </div>
            </div>

            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-white font-bold text-xs shadow-xs transition active:scale-[0.98]"
            >
              <span>RETURN TO LOGIN</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b0e] flex flex-col justify-center py-8 sm:py-12 px-4 transition-colors relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-1">
        <div id="app-logo-slot" className="logo-container mx-auto mb-2 empty:hidden" aria-label="Company Logo Slot"></div>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 dark:bg-emerald-500 shadow-lg shadow-emerald-600/25 text-white mb-2">
          <BusIcon className="w-8 h-8" />
        </div>
        <Badge variant="emerald" className="mb-1">
          STUDENT REGISTRATION
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Student Commuter Registration
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          {step === 'DETAILS'
            ? 'Enter your credentials to initiate Brevo OTP email verification'
            : 'Enter the 6-digit verification code sent to your real email'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.7),0_0_0_1px_#26262e] space-y-5 transition-all">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-[#fb7185] text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-[#fb7185]" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30 text-sky-800 dark:text-sky-300 text-xs font-semibold flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
              <span>{infoMessage}</span>
            </div>
          )}

          {step === 'DETAILS' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tharun Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none font-bold"
                  />
                </div>
              </div>

              {/* Register Number */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Register Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24IT001"
                    value={registerNumber}
                    onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                    className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none font-mono uppercase font-bold tracking-wider"
                  />
                </div>
              </div>

              {/* Real Email */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Real Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="your-real-email@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none font-medium"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  A 6-digit Brevo OTP will be dispatched to this email address.
                </p>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Re-type password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                variant="primary"
                size="lg"
                className="w-full mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Dispatching Brevo OTP...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>CONTINUE TO VERIFY EMAIL</span>
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center py-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#26262e] text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Code expires in: {formatTimer(otpTimer)}</span>
                </div>
              </div>

              <div>
                <label className="block text-center text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="block w-full py-3 text-center text-2xl font-mono tracking-[12px] bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] rounded-xl text-emerald-600 dark:text-emerald-400 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition"
                />
                <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
                  Sent to <strong className="text-zinc-900 dark:text-white">{email}</strong>
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                variant="primary"
                size="lg"
                className="w-full mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>VERIFY & SUBMIT REGISTRATION</span>
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-[#26262e] text-xs">
                <button
                  type="button"
                  onClick={() => setStep('DETAILS')}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition font-medium"
                >
                  ← Edit Details
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold transition disabled:opacity-40"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-zinc-100 dark:border-[#26262e] text-center text-xs text-zinc-500 dark:text-zinc-400">
            <span>Already registered? </span>
            <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
