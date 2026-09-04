import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Bus } from '../../types';
import {
  Bus as BusIcon,
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredBusId, setPreferredBusId] = useState('');
  const [buses, setBuses] = useState<Bus[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Load available buses for preferred bus selection if any exist
    api.getBuses().then((b) => setBuses(b || [])).catch(() => setBuses([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !registerNumber || !email || !phone || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await api.signupStudent({
        name,
        registerNumber,
        email,
        phone,
        password,
        preferredBusId: preferredBusId || undefined,
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
      <div className="min-h-screen bg-gradient-to-br from-[#FAF7F0] via-[#FDFBF7] to-[#F4EFE4] flex flex-col justify-center py-6 sm:py-10 px-4 text-slate-800">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/95 border border-[#EAE2D2] rounded-2xl p-6 sm:p-8 shadow-xl shadow-stone-300/30 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shadow-sm">
              <Clock className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/70 border border-amber-200 px-2.5 py-0.5 rounded-full">
                STATUS: PENDING APPROVAL
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2.5">
                ACCOUNT CREATED
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Your registration has been submitted for Admin approval. You can login after your account has been approved and assigned to a bus by the Admin.
              </p>
            </div>

            <div className="bg-[#FAF7F0] p-3.5 rounded-xl border border-[#EAE2D2] text-xs text-left space-y-1 font-mono text-slate-700">
              <p><span className="text-slate-400 font-sans font-semibold">Name:</span> {name}</p>
              <p><span className="text-slate-400 font-sans font-semibold">Register No:</span> {registerNumber.toUpperCase()}</p>
              <p><span className="text-slate-400 font-sans font-semibold">Email:</span> {email}</p>
            </div>

            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition"
            >
              <span>RETURN TO LOGIN</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F0] via-[#FDFBF7] to-[#F4EFE4] flex flex-col justify-center py-6 sm:py-10 px-4 text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 shadow-md shadow-brand-600/25 text-white mb-1.5">
          <BusIcon className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Student Sign Up
        </h1>
        <p className="text-xs text-amber-900/70 font-medium">
          Create your college bus attendance account
        </p>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md border border-[#EAE2D2] rounded-2xl p-5 sm:p-7 shadow-xl shadow-stone-300/30 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Tharun Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#FAF7F0]/50 border border-[#EAE2D2] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Register Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="text-slate-400 font-mono text-xs font-bold absolute left-3 top-2">#</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24IT001"
                  value={registerNumber}
                  onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#FAF7F0]/50 border border-[#EAE2D2] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none font-mono uppercase transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#FAF7F0]/50 border border-[#EAE2D2] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#FAF7F0]/50 border border-[#EAE2D2] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {buses.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Preferred Bus (Optional)
                </label>
                <select
                  value={preferredBusId}
                  onChange={(e) => setPreferredBusId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF7F0]/50 border border-[#EAE2D2] text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition font-medium"
                >
                  <option value="">Select Preferred Bus</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busNumber} — {b.routeName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#FAF7F0]/50 border border-[#EAE2D2] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#FAF7F0]/50 border border-[#EAE2D2] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="pt-1.5">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Registration...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>CREATE ACCOUNT</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-3 border-t border-[#EAE2D2] text-center text-[11px] text-slate-500">
            <span>Already registered? </span>
            <Link to="/login" className="text-brand-700 font-bold hover:underline">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
