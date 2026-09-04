import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FinalReport } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Final Attendance Reports
          </h1>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Automated session closing reports with bus-wise analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateToday}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-75"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : "Generate Today's Report"}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-7 h-7 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-slate-500">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-[#EAE2D2] shadow-sm">
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
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-[#EAE2D2] space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
              Generated Reports
            </h3>
            <div className="space-y-1 max-h-[450px] overflow-y-auto">
              {reports.map((rep) => (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between ${
                    selectedReport?.id === rep.id
                      ? 'bg-brand-50 border border-brand-200 text-brand-900'
                      : 'hover:bg-[#FAF7F0] text-slate-700'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold">{rep.date}</p>
                    <p className="text-[10px] text-slate-500">
                      {rep.present} / {rep.totalStudents} Present
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-brand-700 bg-white px-2 py-0.5 rounded-lg border border-[#EAE2D2]">
                    {rep.percentage}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Report Viewer */}
          {selectedReport && (
            <div className="lg:col-span-3 space-y-3.5">
              {/* Report Header & Export */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EAE2D2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                    ATTENDANCE REPORT
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900 mt-1">
                    Report Date: {selectedReport.date}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Generated at{' '}
                    {new Date(selectedReport.generatedAt).toLocaleTimeString('en-US', {
                      timeZone: 'Asia/Kolkata',
                    })}{' '}
                    IST
                  </p>
                </div>

                <button
                  onClick={() => handleExportCSV(selectedReport)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-sm self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-3 rounded-2xl border border-[#EAE2D2]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Total Students</span>
                  <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {selectedReport.totalStudents}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-[#EAE2D2]">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase">Present</span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {selectedReport.present}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-[#EAE2D2]">
                  <span className="text-[9px] font-bold text-rose-500 uppercase">Not Present</span>
                  <p className="text-xl font-extrabold text-rose-700 mt-0.5">
                    {selectedReport.notPresent}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-[#EAE2D2]">
                  <span className="text-[9px] font-bold text-brand-600 uppercase">Attendance %</span>
                  <p className="text-xl font-extrabold text-brand-700 mt-0.5">
                    {selectedReport.percentage}%
                  </p>
                </div>
              </div>

              {/* Bus-Wise Breakdown Cards */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EAE2D2] space-y-2.5">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Bus-Wise Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedReport.busWise.map((b) => (
                    <div
                      key={b.busId}
                      className="p-3 rounded-xl bg-[#FAF7F0] border border-[#EAE2D2] flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">{b.busNumber}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{b.routeName}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          Present: <strong className="text-emerald-700">{b.present}</strong> / Absent:{' '}
                          <strong className="text-rose-700">{b.notPresent}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-brand-700">
                          {b.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Details Roster Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#EAE2D2] overflow-hidden">
                <div className="p-3 border-b border-[#EAE2D2]/60">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Individual Student Status ({selectedReport.studentWise.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-[#FAF7F0]/60 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-[#EAE2D2]">
                      <tr>
                        <th className="px-4 py-2">Reg No</th>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Bus</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE2D2]/40">
                      {selectedReport.studentWise.map((stu) => (
                        <tr key={stu.studentId} className="hover:bg-[#FAF7F0]/70 transition">
                          <td className="px-4 py-2 font-bold font-mono text-slate-800">
                            {stu.registerNumber}
                          </td>
                          <td className="px-4 py-2 font-semibold text-slate-900">{stu.name}</td>
                          <td className="px-4 py-2 font-mono text-slate-600">{stu.busNumber}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={stu.status} size="sm" />
                          </td>
                          <td className="px-4 py-2 text-slate-400 font-mono">
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
