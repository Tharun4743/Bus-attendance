import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FinalReport } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  Percent,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<FinalReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<FinalReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const fetchReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateToday = async () => {
    setIsGenerating(true);
    try {
      await api.triggerCron('generate-report');
      const data = await api.getReports();
      setReports(data);
      if (data.length > 0) {
        setSelectedReport(data[0]);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = (report: FinalReport) => {
    const headers = ['Register Number', 'Student Name', 'Bus Number', 'Attendance Status', 'Verified Time', 'Distance (m)'];
    const rows = report.studentWise.map((s) => [
      `"${s.registerNumber}"`,
      `"${s.name}"`,
      `"${s.busNumber}"`,
      `"${s.status}"`,
      `"${s.verifiedAt ? new Date(s.verifiedAt).toLocaleTimeString() : ''}"`,
      `"${s.distanceMeters ?? ''}"`,
    ]);

    const summaryRows = [
      ['=== EVENING BUS ATTENDANCE FINAL REPORT ==='],
      [`Date: ${report.date}`],
      [`Total Active Students: ${report.totalStudents}`],
      [`Present: ${report.present}`],
      [`Not Present: ${report.notPresent}`],
      [`Attendance Turnout: ${report.percentage}%`],
      [''],
      ['=== BUS-WISE BREAKDOWN ==='],
      ...report.busWise.map((b) => [
        `Bus: ${b.busNumber} (${b.routeName}) | Total: ${b.total} | Present: ${b.present} | Absent: ${b.notPresent} | Rate: ${b.percentage}%`,
      ]),
      [''],
      ['=== STUDENT DETAILS ==='],
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ];

    const csvContent = summaryRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `evening_final_report_${report.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <Badge variant="indigo" className="mb-2">
            REPORTS & ARCHIVES
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Final Attendance Reports
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Automated session closing reports with bus-wise analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={handleGenerateToday}
            disabled={isGenerating}
            variant="primary"
            size="md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : "Generate Today's Report"}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-[#141418] rounded-2xl p-6 sm:p-8 border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
          <EmptyState
            icon={FileSpreadsheet}
            title="No reports generated yet"
            description="Daily reports are automatically generated after sessions close. You can also generate one now."
            actionText="Generate Today's Report"
            onAction={handleGenerateToday}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Column: Report List */}
          <div className="bg-white dark:bg-[#141418] rounded-2xl p-4 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-2.5 transition-all">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1 mb-1">
              Generated Reports
            </h3>
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
              {reports.map((rep) => (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className={`w-full p-3 rounded-xl text-left transition flex items-center justify-between cursor-pointer active:scale-95 ${
                    selectedReport?.id === rep.id
                      ? 'bg-zinc-100 dark:bg-[#202028] border border-zinc-300 dark:border-[#2e2e38] text-zinc-900 dark:text-white'
                      : 'hover:bg-zinc-50 dark:hover:bg-[#1a1a20] text-zinc-700 dark:text-zinc-300 border border-transparent'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{rep.date}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {rep.present} / {rep.totalStudents} Present
                    </p>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-[#4ade80] bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-lg">
                    {rep.percentage}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Report Viewer */}
          {selectedReport && (
            <div className="lg:col-span-3 space-y-4">
              {/* Report Header & Export */}
              <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 shadow-xs border border-zinc-200/90 dark:border-[#26262e] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                <div>
                  <Badge variant="blue" className="mb-1.5">
                    ATTENDANCE ARCHIVE
                  </Badge>
                  <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                    Report Date: {selectedReport.date}
                  </h2>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Generated at{' '}
                    {new Date(selectedReport.generatedAt).toLocaleTimeString('en-US', {
                      timeZone: 'Asia/Kolkata',
                    })}{' '}
                    IST
                  </p>
                </div>

                <Button
                  onClick={() => handleExportCSV(selectedReport)}
                  variant="primary"
                  size="sm"
                  className="self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </Button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  title="Total Students"
                  value={selectedReport.totalStudents}
                  icon={<Users className="w-4.5 h-4.5" />}
                  color="indigo"
                />
                <StatCard
                  title="Present"
                  value={selectedReport.present}
                  icon={<CheckCircle2 className="w-4.5 h-4.5" />}
                  color="emerald"
                />
                <StatCard
                  title="Not Present"
                  value={selectedReport.notPresent}
                  icon={<XCircle className="w-4.5 h-4.5" />}
                  color="rose"
                />
                <StatCard
                  title="Attendance %"
                  value={`${selectedReport.percentage}%`}
                  icon={<Percent className="w-4.5 h-4.5" />}
                  color="blue"
                />
              </div>

              {/* Bus-Wise Breakdown Cards */}
              <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-3 transition-all">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Bus-Wise Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedReport.busWise.map((b) => (
                    <div
                      key={b.busId}
                      className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200/80 dark:border-[#26262e] flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-black text-zinc-900 dark:text-white">{b.busNumber}</p>
                        <p className="text-[10px] text-zinc-400 line-clamp-1">{b.routeName}</p>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-300 mt-1">
                          Present: <strong className="text-emerald-600 dark:text-[#4ade80]">{b.present}</strong> / Absent:{' '}
                          <strong className="text-rose-600 dark:text-[#fb7185]">{b.notPresent}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-blue-600 dark:text-sky-400">
                          {b.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Details Roster Table */}
              <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
                <div className="p-4 border-b border-zinc-200 dark:border-[#26262e]">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Individual Student Status ({selectedReport.studentWise.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                      <tr>
                        <th className="px-5 py-3">Reg No</th>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Bus</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                      {selectedReport.studentWise.map((stu) => (
                        <tr key={stu.studentId} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                          <td className="px-5 py-3 font-bold font-mono text-blue-600 dark:text-sky-400">
                            {stu.registerNumber}
                          </td>
                          <td className="px-5 py-3 font-bold text-zinc-900 dark:text-white">{stu.name}</td>
                          <td className="px-5 py-3 font-mono text-zinc-600 dark:text-zinc-300">{stu.busNumber}</td>
                          <td className="px-5 py-3">
                            <StatusBadge status={stu.status} size="sm" />
                          </td>
                          <td className="px-5 py-3 text-zinc-400 font-mono">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};
