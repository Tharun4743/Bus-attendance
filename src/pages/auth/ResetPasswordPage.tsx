import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Lock, ArrowRight, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing password reset token. Please request a new link.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.resetPassword(token, newPassword);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b0e] flex flex-col justify-center py-8 sm:py-12 px-4 transition-colors relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div id="app-logo-slot" className="logo-container mx-auto mb-2 empty:hidden" aria-label="Company Logo Slot"></div>
        <div className="flex flex-col items-center justify-center gap-2 mb-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <Badge variant="emerald">
              CREDENTIAL RECOVERY
            </Badge>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Create New Password
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          Enter your new security credentials below.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#141418] py-8 px-6 sm:px-8 shadow-xl dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.7),0_0_0_1px_#26262e] rounded-3xl border border-zinc-200/90 dark:border-[#26262e] space-y-5 transition-all">
          {isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Password Updated</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Your password has been changed successfully. Redirecting you to login...
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Click here if not redirected automatically <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : !token ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Invalid Reset Link</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                This password reset link is invalid or missing a security token. Please request a new recovery link.
              </p>
              <div className="pt-2">
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Request New Reset Link
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full h-10 pl-10 pr-10 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="w-full h-10 pl-10 pr-10 text-xs rounded-xl bg-zinc-50 dark:bg-[#101014] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="pt-2 text-center border-t border-zinc-100 dark:border-[#26262e]">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
