import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
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
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F0] via-[#FDFBF7] to-[#F4EFE4] flex flex-col justify-center py-6 sm:py-10 px-4 text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-600/25 mb-2.5">
          <Bus className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          BUS ATTENDANCE
        </h1>
        <p className="mt-0.5 text-xs text-amber-900/70 font-medium">
          College Transit & Dynamic Geofence Portal
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-6 px-5 sm:px-8 shadow-xl shadow-stone-300/30 rounded-2xl border border-[#EAE2D2] space-y-4">
          <form className="space-y-3.5" onSubmit={handleLogin}>
            {error && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2.5 animate-in fade-in ${error.type === 'PENDING'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : error.type === 'REJECTED'
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
              >
                {error.type === 'PENDING' ? (
                  <Clock className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                ) : error.type === 'REJECTED' ? (
                  <XCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-[11px]">
                    {error.type === 'PENDING'
                      ? 'ACCOUNT PENDING APPROVAL'
                      : error.type === 'REJECTED'
                        ? 'REGISTRATION REJECTED'
                        : 'LOGIN FAILED'}
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-90 leading-tight">{error.message}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email or Register Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="student@college.edu or 24IT001"
                  className="block w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0]/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0]/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl shadow-sm text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition disabled:opacity-70 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Student Signup Link */}
          <div className="pt-3.5 border-t border-[#EAE2D2] text-center space-y-2">
            <p className="text-[11px] text-slate-500">
              New student riding the college bus?
            </p>
            <Link
              to="/signup"
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-brand-600/30 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Student Account</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
