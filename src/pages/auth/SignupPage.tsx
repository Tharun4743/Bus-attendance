import React, { useState } from 'react';
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
} from 'lucide-react';

export const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const cleanReg = registerNumber.trim().toUpperCase();

    if (!trimmedName || !cleanReg || !password || !confirmPassword) {
      setError('Please fill in all fields (Full Name, Register Number, Password).');
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
      await api.signupStudent({
        name: trimmedName,
        registerNumber: cleanReg,
        password,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b0e] flex flex-col justify-center py-8 sm:py-12 px-4 transition-colors relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
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
                Your account has been submitted for Admin approval. Once approved and assigned to your bus route, you can log in directly using your Register Number and Password.
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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 dark:bg-emerald-500 shadow-lg shadow-emerald-600/25 text-white mb-2">
          <BusIcon className="w-8 h-8" />
        </div>
        <Badge variant="emerald" className="mb-1">
          STUDENT REGISTRATION
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Student Sign Up
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          Create your account in seconds with your Register Number
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-[10px] text-zinc-400 mt-1">
                This will be your primary login ID.
              </p>
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
                  <span>Submitting Registration...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>REGISTER ACCOUNT</span>
                </>
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-zinc-100 dark:border-[#26262e] text-center text-xs text-zinc-500 dark:text-zinc-400">
            <span>Already registered? </span>
            <Link to="/login" className="text-blue-600 dark:text-sky-400 font-bold hover:underline">
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
