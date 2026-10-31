import { InchargeReportsSkeleton } from '../../components/skeleton/InchargeSkeletons';
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { FinalReport } from '../../types';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  FileSpreadsheet,
  Calendar,
  Download,
  RefreshCw,
  Users,
  CheckCircle,
  Percent,
  Compass,
  X,
} from 'lucide-react';
import { formatISTTime } from '../../utils/time';

export const InchargeReports: React.FC = () => {
  const [reports, setReports] = useState<FinalReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchParams] = useSearchParams();
  const sessionQuery = searchParams.get('session')?.toUpperCase();
  const initialSession = sessionQuery === 'MORNING' || sessionQuery === 'EVENING' ? (sessionQuery as 'MORNING' | 'EVENING') : 'ALL';
  const [selectedSessionType, setSelectedSessionType] = useState<'ALL' | 'MORNING' | 'EVENING'>(initialSession);

  useEffect(() => {
    if (sessionQuery === 'MORNING' || sessionQuery === 'EVENING') {
      setSelectedSessionType(sessionQuery as 'MORNING' | 'EVENING');
    }
  }, [sessionQuery]);
  const [selectedReportForModal, setSelectedReportForModal] = useState<FinalReport | null>(null);

  const fetchReports = async () => {
    try {
      const data = await api.getInchargeReports();
      setReports(data || []);
    } catch (err: any) {
      console.error('Failed to load incharge reports:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      await fetchReports();
      if (isMounted) setIsLoading(false);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchReports();
    setIsRefreshing(false);
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesDate = searchDate ? r.date.includes(searchDate) : true;
      const matchesType =
        selectedSessionType === 'ALL' ? true : r.sessionType === selectedSessionType;
      return matchesDate && matchesType;
    });
  }, [reports, searchDate, selectedSessionType]);

  const aggregateStats = useMemo(() => {
    if (filteredReports.length === 0) {
      return { totalReports: 0, totalAudited: 0, totalPresent: 0, avgRate: 0 };
    }
    const totalReports = filteredReports.length;
    const totalAudited = filteredReports.reduce((sum, r) => sum + r.totalStudents, 0);
    const totalPresent = filteredReports.reduce((sum, r) => sum + r.present, 0);
    const avgRate =
      totalAudited > 0 ? Math.round((totalPresent / totalAudited) * 100) : 0;
    return { totalReports, totalAudited, totalPresent, avgRate };
  }, [filteredReports]);

  const handleExportSingleReportCSV = (report: FinalReport) => {
    const headers = ['Register Number', 'Student Name', 'Status', 'Method', 'Verified At', 'Distance (m)'];
    const rows = (report.studentWise || []).map((s) => [
      s.registerNumber,
      `"${s.name.replace(/"/g, '""')}"`,
      s.status,
      s.verificationMethod || 'N/A',
      s.verifiedAt ? formatISTTime(s.verifiedAt) : 'N/A',
      s.distanceMeters !== null && s.distanceMeters !== undefined ? s.distanceMeters : 'N/A',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `report_${report.date}_${report.sessionType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllReportsCSV = () => {
    if (filteredReports.length === 0) return;
    const headers = ['Report Date', 'Session Type', 'Total Students', 'Present', 'Absent', 'Percentage (%)', 'Generated At (IST)'];
    const rows = filteredReports.map((r) => [
      r.date,
      r.sessionType,
      r.totalStudents,
      r.present,
      r.notPresent,
      r.percentage,
      r.generatedAt ? formatISTTime(r.generatedAt) : 'N/A',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `assigned_bus_reports_summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && reports.length === 0) {
    return <InchargeReportsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Assigned Bus Daily Attendance Reports
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Official finalized attendance archives for your designated vehicle
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {filteredReports.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAllReportsCSV}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Export Summary CSV
            </Button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Archived Reports"
          value={aggregateStats.totalReports}
          icon={<FileSpreadsheet className="w-5 h-5 text-white" />}
          subtitle="Finalized session files"
          color="blue"
        />
        <StatCard
          title="Total Student Audits"
          value={aggregateStats.totalAudited}
          icon={<Users className="w-5 h-5 text-white" />}
          subtitle="Commuter check-in slots"
          color="indigo"
        />
        <StatCard
          title="Verified Presents"
          value={aggregateStats.totalPresent}
          icon={<CheckCircle className="w-5 h-5 text-white" />}
          subtitle="Total marked present"
          color="emerald"
        />
        <StatCard
          title="Average Turnout"
          value={`${aggregateStats.avgRate}%`}
          icon={<Percent className="w-5 h-5 text-white" />}
          subtitle="Across audited sessions"
          color="amber"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
            <Calendar className="w-4 h-4" />
            <span>Filter Date:</span>
          </div>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-[#27272a] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 font-medium"
          />
          {searchDate && (
            <button
              onClick={() => setSearchDate('')}
              className="text-xs text-blue-600 dark:text-sky-400 font-semibold hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(['ALL', 'MORNING', 'EVENING'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedSessionType(type)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedSessionType === type
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 dark:bg-[#141418] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-sky-400" />
            <p className="text-xs font-medium text-zinc-500">Retrieving finalized reports...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-[#141418] border-b border-zinc-200 dark:border-[#27272a] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Session Date</th>
                  <th className="py-3.5 px-4">Shift Type</th>
                  <th className="py-3.5 px-4">Assigned Students</th>
                  <th className="py-3.5 px-4">Present</th>
                  <th className="py-3.5 px-4">Absent</th>
                  <th className="py-3.5 px-4">Turnout</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-zinc-500 dark:text-zinc-400">
                      No finalized attendance reports found for your assigned bus.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr
                      key={report.id || `${report.date}-${report.sessionType}`}
                      className="hover:bg-zinc-50 dark:hover:bg-[#1e1e24] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {report.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                          {report.sessionType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                        {report.totalStudents}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        {report.present}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-rose-600 dark:text-rose-400">
                        {report.notPresent}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 dark:bg-sky-500 rounded-full"
                              style={{ width: `${Math.min(report.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {report.percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedReportForModal(report)}
                            className="px-2.5 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
                          >
                            View Roster
                          </button>
                          <button
                            onClick={() => handleExportSingleReportCSV(report)}
                            title="Download CSV"
                            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Student Roster Modal */}
      {selectedReportForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#27272a]">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Attendance Report &bull; {selectedReportForModal.date} ({selectedReportForModal.sessionType})
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedReportForModal.present} Present &bull; {selectedReportForModal.notPresent} Absent &bull; {selectedReportForModal.percentage}% Turnout
                </p>
              </div>
              <button
                onClick={() => setSelectedReportForModal(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-[#141418] border-b border-zinc-200 dark:border-[#27272a] text-zinc-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Register No</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Verified At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                  {(selectedReportForModal.studentWise || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-500">
                        No individual student breakdown records recorded for this report.
                      </td>
                    </tr>
                  ) : (
                    selectedReportForModal.studentWise.map((stu) => (
                      <tr key={stu.studentId} className="hover:bg-zinc-50 dark:hover:bg-[#1e1e24]">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                          {stu.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                          {stu.registerNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={stu.status} />
                        </td>
                        <td className="py-2.5 px-3">
                          {stu.status === 'PRESENT' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-sky-400">
                              <Compass className="w-3 h-3" />
                              {stu.verificationMethod || 'GPS'}
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-500">
                          {stu.verifiedAt ? formatISTTime(stu.verifiedAt) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-[#27272a]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportSingleReportCSV(selectedReportForModal)}
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedReportForModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
