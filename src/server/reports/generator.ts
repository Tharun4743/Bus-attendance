import { StorageAdapter } from '../storage/StorageAdapter';
import { FinalReport, BusReportSummary, StudentReportSummary } from '../../types';
import { getISTDateString } from '../attendance/session';

export class ReportGenerator {
  constructor(private storage: StorageAdapter) {}

  public async generateDailyReport(customDate?: string): Promise<FinalReport> {
    const date = customDate || getISTDateString();
    const students = await this.storage.getStudents();
    const activeStudents = students.filter((s) => s.active);
    const buses = await this.storage.getBuses();
    const attendanceRecords = await this.storage.getAttendance({
      date,
      sessionType: 'EVENING',
    });

    const attendanceMap = new Map(attendanceRecords.map((r) => [r.studentId, r]));

    // Student-wise summary
    const studentWise: StudentReportSummary[] = activeStudents.map((s) => {
      const bus = buses.find((b) => b.id === s.busId);
      const record = attendanceMap.get(s.id);
      return {
        studentId: s.id,
        registerNumber: s.registerNumber,
        name: s.name,
        busId: s.busId,
        busNumber: bus ? bus.busNumber : 'Unassigned',
        status: record ? record.status : 'NOT_PRESENT',
        verifiedAt: record?.verifiedAt,
        distanceMeters: record?.distanceMeters,
        accuracyMeters: record?.accuracyMeters,
      };
    });

    // Bus-wise summary
    const busWise: BusReportSummary[] = buses
      .filter((b) => b.active)
      .map((bus) => {
        const busStudents = activeStudents.filter((s) => s.busId === bus.id);
        const total = busStudents.length;
        const present = busStudents.filter((s) => {
          const rec = attendanceMap.get(s.id);
          return rec && rec.status === 'PRESENT';
        }).length;
        const notPresent = total - present;
        const percentage = total > 0 ? Math.round((present / total) * 10000) / 100 : 0;

        return {
          busId: bus.id,
          busNumber: bus.busNumber,
          routeName: bus.routeName,
          total,
          present,
          notPresent,
          percentage,
        };
      });

    const totalStudents = activeStudents.length;
    const present = studentWise.filter((s) => s.status === 'PRESENT').length;
    const notPresent = totalStudents - present;
    const percentage =
      totalStudents > 0 ? Math.round((present / totalStudents) * 10000) / 100 : 0;

    const report: FinalReport = {
      id: `REP-${date.replace(/-/g, '')}-EVENING`,
      date,
      sessionType: 'EVENING',
      totalStudents,
      present,
      notPresent,
      percentage,
      busWise,
      studentWise,
      generatedAt: new Date().toISOString(),
    };

    // Save report in JSON storage
    await this.storage.saveReport(report);

    // Create Admin In-App Notification
    await this.storage.createNotification({
      title: '🔔 Evening Bus Attendance Report',
      message: `Attendance completed for today. Total Students: ${totalStudents}, Present: ${present}, Not Present: ${notPresent}, Attendance: ${percentage}%`,
      type: 'REPORT',
      date,
      read: false,
      link: `/admin/reports`,
      metadata: {
        totalStudents,
        present,
        notPresent,
        percentage,
        reportId: report.id,
      },
    });

    return report;
  }
}
