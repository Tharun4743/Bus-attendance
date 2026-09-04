import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, SessionInfo } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Download,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-slate-500">Loading today's attendance roster...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Today's Attendance Session
            </h1>
            <StatusBadge status={data?.sessionInfo.status || 'ACTIVE'} size="sm" />
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {data?.date} • {data?.sessionInfo.startTime} – {data?.sessionInfo.endTime} IST •{' '}
            {data?.sessionInfo.locationName} ({data?.sessionInfo.radiusMeters}m Radius)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#EAE2D2] hover:bg-[#FAF7F0] text-slate-700 font-semibold rounded-xl text-xs transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#EAE2D2] hover:bg-[#FAF7F0] text-slate-700 font-semibold rounded-xl text-xs transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#EAE2D2] hover:bg-[#FAF7F0] text-slate-700 font-semibold rounded-xl text-xs transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* 4 Dashboard Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
          <p className="text-xl font-extrabold text-slate-800 mt-0.5">{data?.stats.total ?? 0}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Present</span>
          <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{data?.stats.present ?? 0}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Not Present</span>
          <p className="text-xl font-extrabold text-rose-700 mt-0.5">{data?.stats.notPresent ?? 0}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Percentage</span>
          <p className="text-xl font-extrabold text-brand-700 mt-0.5">{data?.stats.percentage ?? 0}%</p>
        </div>
      </div>

      {/* Filter Tabs & Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE2D2] overflow-hidden">
        <div className="p-3 border-b border-[#EAE2D2]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Students' },
              { id: 'PRESENT', label: 'Present' },
              { id: 'NOT_PRESENT', label: 'Not Present' },
              { id: 'LOCATION_ISSUES', label: 'Location Issues' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-[#FAF7F0] text-slate-600 hover:bg-[#F4EFE4] border border-[#EAE2D2]'
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
            className="px-2.5 py-1 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-medium text-slate-700 outline-none self-start sm:self-auto"
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
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#FAF7F0]/60 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-[#EAE2D2]">
              <tr>
                <th className="px-4 py-2.5">Register No</th>
                <th className="px-4 py-2.5">Student Name</th>
                <th className="px-4 py-2.5">Bus & Route</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Distance</th>
                <th className="px-4 py-2.5">Accuracy</th>
                <th className="px-4 py-2.5">Verified Time</th>
                <th className="px-4 py-2.5 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D2]/40">
              {filteredRoster.map((stu) => (
                <tr key={stu.studentId} className="hover:bg-[#FAF7F0]/70 transition">
                  <td className="px-4 py-2.5 font-bold font-mono text-slate-800">
                    {stu.registerNumber}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{stu.name}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-slate-800">{stu.busNumber}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{stu.routeName}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={stu.status} size="sm" />
                      {stu.verificationMethod === 'ADMIN_OVERRIDE' && (
                        <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                          Admin Override
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">
                    {stu.distanceMeters != null ? `${stu.distanceMeters}m` : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">
                    {stu.accuracyMeters != null ? `${stu.accuracyMeters}m` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 font-mono">
                    {stu.verifiedAt
                      ? new Date(stu.verifiedAt).toLocaleTimeString('en-US', {
                          timeZone: 'Asia/Kolkata',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleOpenOverride(stu)}
                      className="px-2 py-0.5 text-[11px] font-bold text-slate-700 bg-[#FAF7F0] hover:bg-purple-100 hover:text-purple-700 rounded-lg transition border border-[#EAE2D2]"
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
          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900">
            <p className="font-bold">Student: {selectedStudent?.name} ({selectedStudent?.registerNumber})</p>
            <p className="mt-0.5 text-purple-700">Assigned Bus: {selectedStudent?.busNumber}</p>
          </div>

          {overrideError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{overrideError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              New Attendance Status *
            </label>
            <select
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none font-bold"
            >
              <option value="PRESENT">PRESENT (Verified Present)</option>
              <option value="NOT_PRESENT">NOT_PRESENT (Mark Absent)</option>
              <option value="LOCATION_UNAVAILABLE">LOCATION_UNAVAILABLE (GPS Issue)</option>
              <option value="INVALID_LOCATION">INVALID_LOCATION (Outside Boundary)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Administrative Override *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Student phone battery depleted; verified physically on bus."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOverrideOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingOverride}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-sm disabled:opacity-70"
            >
              {isSubmittingOverride ? 'Applying...' : 'Apply Override'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
