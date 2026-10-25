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
  Compass,
  GraduationCap,
} from 'lucide-react';

export const SignupPage: React.FC = () => {
  // Role Selection
  const [role, setRole] = useState<'STUDENT' | 'INCHARGE'>('STUDENT');

  // Common Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Student-specific States
  const [registerNumber, setRegisterNumber] = useState('');
  const [preferredBusId, setPreferredBusId] = useState('');
  const [availableBuses, setAvailableBuses] = useState<
    Array<{ id: string; busNumber: string; routeName: string; hasIncharge: boolean; inchargeName: string }>
  >([]);
  const [loadingBuses, setLoadingBuses] = useState(false);

  // Incharge-specific States
  const [busNumber, setBusNumber] = useState('');
  const [routeName, setRouteName] = useState('');

  // Step States: DETAILS -> OTP -> SUCCESS
  const [step, setStep] = useState<'DETAILS' | 'OTP' | 'SUCCESS'>('DETAILS');
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(600); // 10 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState(60);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Load available buses for student registration
  useEffect(() => {
    let isMounted = true;
    const fetchBuses = async () => {
      setLoadingBuses(true);
      try {
        const res = await api.getAvailableBuses();
        if (isMounted && res.buses) {
          setAvailableBuses(res.buses);
          if (res.buses.length > 0 && !preferredBusId) {
            setPreferredBusId(res.buses[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not load available buses:', err);
      } finally {
        if (isMounted) setLoadingBuses(false);
      }
    };

    fetchBuses();
    return () => {
      isMounted = false;
    };
  }, []);

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
    const cleanEmail = email.trim().toLowerCase();

    if (!trimmedName || !cleanEmail || !password || !confirmPassword) {
      setError('Please fill in all required fields (Name, Email, Password).');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
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

    if (role === 'STUDENT') {
      const cleanReg = registerNumber.trim().toUpperCase();
      if (!cleanReg) {
        setError('Register Number is mandatory for Student registration.');
        return;
      }
      if (!preferredBusId) {
        setError('Please select an active In-Charge Bus. Students can only register for an assigned Bus In-Charge.');
        return;
      }
    } else {
      const cleanBusNo = busNumber.trim();
      if (!cleanBusNo) {
        setError('Bus Number is mandatory for Bus In-Charge registration.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const res = await api.requestOtp({
        role,
        name: trimmedName,
        email: cleanEmail,
        phone: phone.trim(),
        password,
        registerNumber: role === 'STUDENT' ? registerNumber.trim().toUpperCase() : undefined,
        preferredBusId: role === 'STUDENT' ? preferredBusId : undefined,
        busNumber: role === 'INCHARGE' ? busNumber.trim() : undefined,
        routeName: role === 'INCHARGE' ? routeName.trim() : undefined,
      });

      setInfoMessage(res.message || `A 6-digit verification code has been dispatched to ${cleanEmail}.`);
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
        role,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        registerNumber: role === 'STUDENT' ? registerNumber.trim().toUpperCase() : undefined,
        preferredBusId: role === 'STUDENT' ? preferredBusId : undefined,
        busNumber: role === 'INCHARGE' ? busNumber.trim() : undefined,
        routeName: role === 'INCHARGE' ? routeName.trim() : undefined,
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

  // Step 3: Registration Success & Pending Approval Confirmation
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
                STATUS: PENDING ADMIN APPROVAL
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white mt-1">
                {role === 'INCHARGE' ? 'Bus In-Charge Registration Submitted' : 'Student Registration Submitted'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {role === 'INCHARGE'
                  ? 'Your email has been verified successfully. Your Bus In-Charge account and requested bus route assignment are currently pending administrative review. You will be able to log in once an Administrator approves your request.'
                  : 'Your email has been verified successfully. Your student profile has been submitted for transport administrator review and bus route assignment.'}
              </p>
            </div>

            <div className="bg-zinc-50 dark:bg-[#1a1a20] p-4 rounded-xl border border-zinc-200/80 dark:border-[#26262e] text-xs text-left space-y-2 font-mono">
              <div className="flex justify-between border-b border-zinc-200 dark:border-[#26262e] pb-1.5 font-sans">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Role:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {role === 'INCHARGE' ? 'Bus In-Charge' : 'Student Commuter'}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 dark:border-[#26262e] pb-1.5 font-sans">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Full Name:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{name}</span>
              </div>
              {role === 'STUDENT' ? (
                <>
                  <div className="flex justify-between border-b border-zinc-200 dark:border-[#26262e] pb-1.5 font-sans">
                    <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Register Number:</span>
                    <span className="font-bold text-blue-600 dark:text-sky-400 font-mono">{registerNumber.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200 dark:border-[#26262e] pb-1.5 font-sans">
                    <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Requested Bus:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{preferredBusId}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between border-b border-zinc-200 dark:border-[#26262e] pb-1.5 font-sans">
                    <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Assigned Bus Number:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{busNumber.toUpperCase()}</span>
                  </div>
                  {routeName && (
                    <div className="flex justify-between border-b border-zinc-200 dark:border-[#26262e] pb-1.5 font-sans">
                      <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Route Name:</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{routeName}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between border-b border-zinc-200 dark:border-[#26262e] pb-1.5 font-sans">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Verified Email:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{email.toLowerCase()}</span>
              </div>
              <div className="flex justify-between font-sans pt-0.5">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Login Identifier:</span>
                <span className="font-bold text-zinc-900 dark:text-white font-mono">
                  {role === 'STUDENT' ? registerNumber.toUpperCase() : email.toLowerCase()}
                </span>
              </div>
            </div>

            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-white font-bold text-xs shadow-xs transition active:scale-[0.98]"
            >
              <span>PROCEED TO SIGN IN</span>
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
          {role === 'INCHARGE' ? <BusIcon className="w-8 h-8" /> : <GraduationCap className="w-8 h-8" />}
        </div>
        <Badge variant={role === 'INCHARGE' ? 'indigo' : 'emerald'} className="mb-1">
          {role === 'INCHARGE' ? 'BUS IN-CHARGE ONBOARDING' : 'STUDENT COMMUTER ONBOARDING'}
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          {role === 'INCHARGE' ? 'Bus In-Charge Registration' : 'Student Commuter Registration'}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          {step === 'DETAILS'
            ? 'Create your account to access the campus transit system'
            : 'Enter the 6-digit verification code sent to your email'}
        </p>

        {/* Role Segmented Selector */}
        {step === 'DETAILS' && (
          <div className="pt-2 flex justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-zinc-200/80 dark:bg-[#1a1a22] border border-zinc-200 dark:border-[#2a2a36]">
              <button
                type="button"
                onClick={() => setRole('STUDENT')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  role === 'STUDENT'
                    ? 'bg-white dark:bg-[#252530] text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student Commuter</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('INCHARGE')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  role === 'INCHARGE'
                    ? 'bg-white dark:bg-[#252530] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <BusIcon className="w-3.5 h-3.5" />
                <span>Bus In-Charge</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md">
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
                    placeholder={role === 'INCHARGE' ? 'e.g. Prof. S. Ramesh' : 'e.g. Tharunkumar K'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none font-bold"
                  />
                </div>
              </div>

              {/* STUDENT ONLY: Register Number */}
              {role === 'STUDENT' && (
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
              )}

              {/* STUDENT ONLY: Bus In-Charge Bus Selection */}
              {role === 'STUDENT' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Bus In-Charge Route <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Must have assigned In-Charge
                    </span>
                  </div>

                  <div className="relative">
                    <Compass className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                    {loadingBuses ? (
                      <div className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] flex items-center text-zinc-400">
                        Loading available In-Charge routes...
                      </div>
                    ) : availableBuses.length > 0 ? (
                      <select
                        required
                        value={preferredBusId}
                        onChange={(e) => setPreferredBusId(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none font-medium"
                      >
                        {availableBuses.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.busNumber} — {b.routeName} (In-Charge: {b.inchargeName})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          required
                          placeholder="Enter Bus In-Charge Number (e.g. BUS06)"
                          value={preferredBusId}
                          onChange={(e) => setPreferredBusId(e.target.value.toUpperCase())}
                          className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none font-bold"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Student attendance verification is strictly bound to your assigned Bus In-Charge perimeter.
                  </p>
                </div>
              )}

              {/* INCHARGE ONLY: Bus Number & Route Name */}
              {role === 'INCHARGE' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                      Bus Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <BusIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. TN-33-AX-8899 or BUS06"
                        value={busNumber}
                        onChange={(e) => setBusNumber(e.target.value.toUpperCase())}
                        className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none font-bold tracking-wider"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                      Route Name
                    </label>
                    <div className="relative">
                      <Compass className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. Dharapuram Express Route"
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none font-medium"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="you@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none font-medium"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  We'll dispatch a 6-digit verification code to this address.
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
                    placeholder="+91 98765 43210"
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
                    placeholder="Create a password (min 6 characters)"
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
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none"
                  />
                </div>
              </div>

              {role === 'INCHARGE' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong>Administrative Review Required:</strong> Bus In-Charge accounts must be approved by the SuperAdmin before login access is granted.
                  </span>
                </div>
              )}

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
                    <span>Sending verification code...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Continue & Verify Email</span>
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
                    <span>Verify Code & Complete Sign Up</span>
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
