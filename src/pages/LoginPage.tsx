import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Bus, Lock, Mail, ArrowRight, AlertCircle, UserPlus, Clock, XCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<{ message: string; type?: string; reason?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if initial setup is needed
    api.getSetupStatus().then((res) => {
      if (res.needsSetup) {
        navigate('/setup', { replace: true });
      }
    }).catch(() => { });
  }, [navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email || !password) {
      setError({ message: 'Please enter both Email/Register Number and Password.' });
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'INCHARGE') {
        navigate('/incharge/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      if (msg.includes('waiting for Admin approval')) {
        setError({
          type: 'PENDING',
          message: 'Your account is still waiting for Admin approval. You will be able to login once approved.',
        });
      } else if (msg.includes('rejected')) {
        setError({
          type: 'REJECTED',
          message: 'Your registration was rejected by Admin. Please contact the administrator for assistance.',
        });
      } else if (msg.includes('deactivated')) {
        setError({
          type: 'INACTIVE',
          message: 'Your account has been deactivated.',
        });
      } else {
        setError({ message: msg });
      }
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
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 mb-3">
          <Bus className="w-8 h-8" />
        </div>
        <Badge variant="emerald" className="mb-2">
          TRANSPORT PORTAL
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Bus Attendance
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          College Transit & Dynamic Geofence Portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#141418] py-8 px-6 sm:px-8 shadow-xl dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.7),0_0_0_1px_#26262e] rounded-3xl border border-zinc-200/90 dark:border-[#26262e] space-y-5 transition-all">
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                  error.type === 'PENDING'
                    ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-[#fde047]'
                    : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-[#fb7185]'
                }`}
              >
                {error.type === 'PENDING' ? (
                  <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-[#fde047] mt-0.5" />
                ) : error.type === 'REJECTED' ? (
                  <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-[#fb7185] mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-[#fb7185] mt-0.5" />
                )}
                <div>
                  <p className="font-black text-[11px] uppercase tracking-wider">
                    {error.type === 'PENDING'
                      ? 'Account Pending Approval'
                      : error.type === 'REJECTED'
                        ? 'Registration Rejected'
                        : 'Login Failed'}
                  </p>
                  <p className="text-xs mt-0.5 opacity-90 leading-tight">{error.message}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Email or Register Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="student@college.edu or 24IT001"
                  className="block w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              size="lg"
              className="w-full mt-3"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Student Signup Link */}
          <div className="pt-4 border-t border-zinc-100 dark:border-[#26262e] text-center space-y-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              New student riding the college bus?
            </p>
            <Link
              to="/signup"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-[#26262e] bg-zinc-100 dark:bg-[#1a1a20] hover:bg-zinc-200 dark:hover:bg-[#26262e] text-zinc-900 dark:text-white font-bold text-xs sm:text-sm transition active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" />
              <span>Create Student Account</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
