import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Bus, SessionInfo } from '../../types';
import { SessionBanner } from '../../components/common/SessionBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SessionTimeControl } from '../../components/admin/SessionTimeControl';
import { LocationControl } from '../../components/admin/LocationControl';
import { StartAttendanceModal } from '../../components/admin/StartAttendanceModal';
import { PwaNotificationPrompt } from '../../components/common/PwaNotificationPrompt';
import {
  Users,
  CheckCircle2,
  XCircle,
  Percent,
  Bus as BusIcon,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet,
  MapPin,
  Clock,
  Radio,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<{
    date: string;
    sessionInfo: SessionInfo;
    stats: { total: number; present: number; notPresent: number; percentage: number };
    roster: Array<{
      studentId: string;
      registerNumber: string;
      name: string;
      busId: string;
      busNumber: string;
      routeName: string;
      status: string;
      distanceMeters: number | null;
      accuracyMeters: number | null;
      verifiedAt: string | null;
      verificationMethod: string | null;
      overrideReason: string | null;
      recordId: string | null;
    }>;
    buses: Bus[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showTimeControl, setShowTimeControl] = useState<boolean>(false);
  const [showLocationControl, setShowLocationControl] = useState<boolean>(false);
  const [showDispatcher, setShowDispatcher] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      const res = await api.getTodayAttendance();
      setData(res);
    } catch (err) {
      console.error('Failed to load admin today attendance:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading admin transport dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* PWA Device Push Notification Permission Prompt */}
      <PwaNotificationPrompt />

      {/* Top Authoritative Session Status Banner */}
      <SessionBanner />

      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Transport Overview
          </h1>
          <p className="text-[11px] text-amber-900/70 font-medium">
            Morning & evening transit attendance monitoring, moving bus dispatch, and roster verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setShowDispatcher(!showDispatcher)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{showDispatcher ? 'Hide Dispatcher' : 'Start Attendance'}</span>
          </button>

          <button
            onClick={() => {
              setShowTimeControl(!showTimeControl);
              if (!showTimeControl) {
                setShowLocationControl(false);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold rounded-xl text-xs transition shadow-sm"
          >
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            <span>{showTimeControl ? 'Hide Time' : 'Time Setting'}</span>
          </button>

          <button
            onClick={() => {
              setShowLocationControl(!showLocationControl);
              if (!showLocationControl) {
                setShowTimeControl(false);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs transition shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>{showLocationControl ? 'Hide Location' : 'Location Setting'}</span>
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#EAE2D2] hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/students"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </Link>
        </div>
      </div>

      {/* Live Attendance Session Dispatcher (Morning/Evening, Ground/Travelling) */}
      {showDispatcher && (
        <StartAttendanceModal buses={data?.buses || []} onSessionChanged={fetchData} />
      )}

      {/* Manual Attendance Time Control Card */}
      {showTimeControl && (
        <SessionTimeControl onUpdated={fetchData} />
      )}

      {/* Manual Attendance Location Control Card */}
      {showLocationControl && (
        <LocationControl onUpdated={fetchData} />
      )}

      {/* Core Attendance Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TOTAL STUDENTS
            </span>
            <div className="p-1.5 rounded-lg bg-[#FAF7F0] text-slate-600 border border-[#EAE2D2]">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {data?.stats.total ?? 0}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Registered Active Roster</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              PRESENT
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {data?.stats.present ?? 0}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium">Verified in Session</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
              NOT PRESENT
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/60">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-1">
            {data?.stats.notPresent ?? 0}
          </p>
          <p className="text-[10px] text-rose-500 font-medium">Pending / Unverified</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">
              ATTENDANCE %
            </span>
            <div className="p-1.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200/60">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-brand-700 mt-1">
            {data?.stats.percentage ?? 0}%
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Overall Turnout Rate</p>
        </div>
      </div>

      {/* Live Attendance Preview & Bus Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left (2 cols): Live Roster */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EAE2D2] shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-[#EAE2D2] flex items-center justify-between bg-[#FAF7F0]/40">
            <div>
              <h2 className="text-xs font-bold text-slate-800">Live Attendance Roster</h2>
              <p className="text-[10px] text-slate-400">Auto-refreshing status for today's active session</p>
            </div>
            <Link
              to="/admin/attendance"
              className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              <span>View Full Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#FAF7F0] text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-[#EAE2D2]">
                <tr>
                  <th className="px-3.5 py-2.5">Reg Number</th>
                  <th className="px-3.5 py-2.5">Student</th>
                  <th className="px-3.5 py-2.5">Bus</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE2D2]/50">
                {data?.roster.slice(0, 6).map((stu) => (
                  <tr key={stu.studentId} className="hover:bg-[#FAF7F0]/60 transition">
                    <td className="px-3.5 py-2.5 font-bold font-mono text-slate-800">
                      {stu.registerNumber}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-slate-800">{stu.name}</td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-500">{stu.busNumber}</td>
                    <td className="px-3.5 py-2.5">
                      <StatusBadge status={stu.status} size="sm" />
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400 font-mono">
                      {stu.verifiedAt
                        ? new Date(stu.verifiedAt).toLocaleTimeString('en-US', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (1 col): Bus Stats & Quick Links */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-[#EAE2D2] p-3.5 shadow-sm space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Configured Buses
            </h3>
            <div className="space-y-2">
              {data?.buses.map((bus) => {
                const busStudents = data.roster.filter((r) => r.busId === bus.id);
                const busPresent = busStudents.filter((r) => r.status === 'PRESENT').length;
                const busTotal = busStudents.length;
                const pct = busTotal > 0 ? Math.round((busPresent / busTotal) * 100) : 0;

                return (
                  <div
                    key={bus.id}
                    className="p-2.5 rounded-xl bg-[#FAF7F0] border border-[#EAE2D2] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-brand-100 text-brand-700">
                        <BusIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{bus.busNumber}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{bus.routeName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">
                        {busPresent}/{busTotal}
                      </p>
                      <p className="text-[10px] text-brand-600 font-bold">{pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-3.5 text-white shadow-sm space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              System Rules & Policy
            </h3>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <span>Evening Session: 4:50 PM – 4:55 PM IST</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <span>Geofence: College Ground (10m radius)</span>
              </li>
              <li className="flex items-center gap-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <span>Daily Final Report generated at 4:57 PM</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
