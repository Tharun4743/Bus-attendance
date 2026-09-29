import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, SessionInfo } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Download,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  XCircle,
  Percent,
} from 'lucide-react';

export const TodayAttendance: React.FC = () => {
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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [busFilter, setBusFilter] = useState<string>('ALL');

  // Override Modal State
  const [isOverrideOpen, setIsOverrideOpen] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>('PRESENT');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const res = await api.getTodayAttendance();
      setData(res);
    } catch (err) {
      console.error('Failed to load today attendance:', err);
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

  // Open Override Modal
  const handleOpenOverride = (stu: any) => {
    setSelectedStudent(stu);
    setOverrideStatus(stu.status === 'PRESENT' ? 'NOT_PRESENT' : 'PRESENT');
    setOverrideReason('');
    setOverrideError(null);
    setIsOverrideOpen(true);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setOverrideError('Please provide an administrative reason for the override.');
      return;
    }

    setOverrideError(null);
    setIsSubmittingOverride(true);

    try {
      await api.adminOverride({
        studentId: selectedStudent.studentId,
        date: data?.date,
        newStatus: overrideStatus,
        reason: overrideReason.trim(),
      });
      setIsOverrideOpen(false);
      fetchData();
    } catch (err: any) {
      setOverrideError(err.message || 'Failed to submit override.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      'Register Number',
      'Student Name',
      'Bus Number',
      'Route',
      'Attendance Status',
      'Verified Time',
      'Distance (meters)',
      'GPS Accuracy (meters)',
      'Verification Method',
      'Override Reason',
    ];

    const rows = filteredRoster.map((r) => [
      `"${r.registerNumber}"`,
      `"${r.name}"`,
      `"${r.busNumber}"`,
      `"${r.routeName}"`,
      `"${r.status}"`,
      `"${r.verifiedAt ? new Date(r.verifiedAt).toLocaleTimeString() : ''}"`,
      `"${r.distanceMeters ?? ''}"`,
      `"${r.accuracyMeters ?? ''}"`,
      `"${r.verificationMethod || 'GPS_GEOFENCE'}"`,
      `"${r.overrideReason || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `evening_attendance_${data.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `evening_attendance_${data.date}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRoster = (data?.roster || []).filter((r) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'LOCATION_ISSUES') {
        if (r.status !== 'LOCATION_UNAVAILABLE' && r.status !== 'INVALID_LOCATION') return false;
      } else if (r.status !== statusFilter) {
        return false;
      }
    }
    if (busFilter !== 'ALL' && r.busId !== busFilter) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loading today's attendance roster...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="blue">
              DAILY OPERATIONS
            </Badge>
            <StatusBadge status={data?.sessionInfo.status || 'ACTIVE'} size="sm" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Today's Attendance Session
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            {data?.date} • {data?.sessionInfo.startTime} – {data?.sessionInfo.endTime} IST •{' '}
            {data?.sessionInfo.locationName} ({data?.sessionInfo.radiusMeters}m Radius)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={handleRefresh}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="secondary"
            size="sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-[#4ade80]" />
            <span>Export CSV</span>
          </Button>
          <Button
            onClick={handleExportJSON}
            variant="secondary"
            size="sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            <span>JSON</span>
          </Button>
        </div>
      </div>

      {/* 4 Dashboard Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Students"
          value={data?.stats.total ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          subtitle="Enrolled Roster"
        />
        <StatCard
          title="Present"
          value={data?.stats.present ?? 0}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          subtitle="Location Verified"
        />
        <StatCard
          title="Not Present"
          value={data?.stats.notPresent ?? 0}
          icon={<XCircle className="w-5 h-5" />}
          color="rose"
          subtitle="Absent or Unverified"
        />
        <StatCard
          title="Percentage"
          value={`${data?.stats.percentage ?? 0}%`}
          icon={<Percent className="w-5 h-5" />}
          color="blue"
          subtitle="Turnout Rate"
        />
      </div>

      {/* Filter Tabs & Table Container */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#1a1a20] p-1 rounded-xl border border-zinc-200 dark:border-[#26262e]">
            {[
              { id: 'ALL', label: 'All Students' },
              { id: 'PRESENT', label: 'Present' },
              { id: 'NOT_PRESENT', label: 'Not Present' },
              { id: 'LOCATION_ISSUES', label: 'Location Issues' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bus Filter */}
          <select
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-white dark:bg-[#1a1a20] text-zinc-900 dark:text-white outline-none self-start sm:self-auto"
          >
            <option value="ALL">All Buses</option>
            {data?.buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.busNumber}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
              <tr>
                <th className="px-5 py-3.5">Register No</th>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">Bus & Route</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Distance</th>
                <th className="px-5 py-3.5">Accuracy</th>
                <th className="px-5 py-3.5">Verified Time</th>
                <th className="px-5 py-3.5 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
              {filteredRoster.map((stu) => (
                <tr key={stu.studentId} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                  <td className="px-5 py-4 font-bold font-mono text-blue-600 dark:text-sky-400">
                    {stu.registerNumber}
                  </td>
                  <td className="px-5 py-4 font-bold text-zinc-900 dark:text-white">{stu.name}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">{stu.busNumber}</p>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">{stu.routeName}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={stu.status} size="sm" />
                      {stu.verificationMethod === 'ADMIN_OVERRIDE' && (
                        <span className="text-[10px] text-purple-700 dark:text-[#c084fc] bg-purple-50 dark:bg-purple-500/15 px-2 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-500/30">
                          Admin Override
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-zinc-600 dark:text-zinc-300">
                    {stu.distanceMeters != null ? `${stu.distanceMeters}m` : '—'}
                  </td>
                  <td className="px-5 py-4 font-mono text-zinc-600 dark:text-zinc-300">
                    {stu.accuracyMeters != null ? `${stu.accuracyMeters}m` : '—'}
                  </td>
                  <td className="px-5 py-4 text-zinc-500 dark:text-zinc-400 font-mono">
                    {stu.verifiedAt
                      ? new Date(stu.verifiedAt).toLocaleTimeString('en-US', {
                          timeZone: 'Asia/Kolkata',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleOpenOverride(stu)}
                      className="px-3 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-purple-50 hover:text-purple-700 dark:bg-zinc-800 dark:hover:bg-purple-950/40 dark:hover:text-[#c084fc] rounded-xl transition border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95"
                    >
                      Override
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Modal */}
      <Modal
        isOpen={isOverrideOpen}
        onClose={() => setIsOverrideOpen(false)}
        title="Admin Attendance Override"
      >
        <form onSubmit={handleSaveOverride} className="space-y-4">
          <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-500/30 text-xs text-purple-900 dark:text-purple-300">
            <p className="font-bold">Student: {selectedStudent?.name} ({selectedStudent?.registerNumber})</p>
            <p className="mt-0.5 text-purple-700 dark:text-purple-400">Assigned Bus: {selectedStudent?.busNumber}</p>
          </div>

          {overrideError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 flex items-center gap-2 text-rose-700 dark:text-[#fb7185] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{overrideError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              New Attendance Status *
            </label>
            <select
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
              className="w-full h-11 px-3.5 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none font-bold"
            >
              <option value="PRESENT">PRESENT (Verified Present)</option>
              <option value="NOT_PRESENT">NOT_PRESENT (Mark Absent)</option>
              <option value="LOCATION_UNAVAILABLE">LOCATION_UNAVAILABLE (GPS Issue)</option>
              <option value="INVALID_LOCATION">INVALID_LOCATION (Outside Boundary)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Reason for Administrative Override *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Student phone battery depleted; verified physically on bus."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none font-medium leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-[#26262e]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsOverrideOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingOverride}
              variant="primary"
              size="sm"
            >
              {isSubmittingOverride ? 'Applying...' : 'Apply Override'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
