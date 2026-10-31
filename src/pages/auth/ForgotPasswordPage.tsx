import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Bus, Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered email address.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.forgotPassword(email.trim());
      setSuccessMessage(res.message || 'Password reset link has been dispatched to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch reset link. Please verify your connection.');
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
            <Bus className="w-8 h-8" />
          </div>
          <div>
            <Badge variant="emerald">
              ACCOUNT RECOVERY
            </Badge>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Reset Your Password
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          Enter your registered email and we'll dispatch a secure recovery link.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#141418] py-8 px-6 sm:px-8 shadow-xl dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.7),0_0_0_1px_#26262e] rounded-3xl border border-zinc-200/90 dark:border-[#26262e] space-y-5 transition-all">
          {successMessage ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Check Your Inbox</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {successMessage}
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-[#fb7185] text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-[#fb7185]" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="block w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                size="lg"
                className="w-full mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending link...
                  </>
                ) : (
                  <>
                    Send Recovery Link <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
