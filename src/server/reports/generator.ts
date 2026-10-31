import { StorageAdapter } from '../storage/StorageAdapter';
import { FinalReport, BusReportSummary, StudentReportSummary, SessionType } from '../../types';
import { getISTDateString } from '../attendance/session';

export class ReportGenerator {
  constructor(private storage: StorageAdapter) {}

  public async generateDailyReport(
    customDateOrSession?: string | SessionType,
    sessionTypeParam?: SessionType
  ): Promise<FinalReport> {
    let date = getISTDateString();
    let sessionType: SessionType = 'EVENING';

    if (customDateOrSession === 'MORNING' || customDateOrSession === 'EVENING') {
      sessionType = customDateOrSession;
      if (sessionTypeParam && /^\d{4}-\d{2}-\d{2}$/.test(sessionTypeParam)) {
        date = sessionTypeParam;
      }
    } else if (customDateOrSession) {
      date = customDateOrSession;
      if (sessionTypeParam) {
        sessionType = sessionTypeParam;
      }
    } else if (sessionTypeParam) {
      sessionType = sessionTypeParam;
    }

    const students = await this.storage.getStudents();
    
    // Eligible students: Must be active, approved, and with status 'APPROVED'
    const eligibleStudents = students.filter(
      (s) => s.active && s.approved && (s.status === 'APPROVED' || s.status === undefined) && s.busId
    );
    const buses = await this.storage.getBuses();
    const attendanceRecords = await this.storage.getAttendance({
      date,
      sessionType,
    });

    // Deduplicate records mapping to the verified present status
    const attendanceMap = new Map(attendanceRecords.map((r) => [r.studentId, r]));

    // Student-wise summary
    const studentWise: StudentReportSummary[] = eligibleStudents.map((s) => {
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
        verificationMethod: record?.verificationMethod,
      };
    });

    // Bus-wise summary
    const busWise: BusReportSummary[] = buses
      .filter((b) => b.active)
      .map((bus) => {
        const busStudents = eligibleStudents.filter((s) => s.busId === bus.id);
        const total = busStudents.length;
        
        let groundCount = 0;
        let travellingCount = 0;

        const presentStudents = busStudents.filter((s) => {
          const rec = attendanceMap.get(s.id);
          if (rec && rec.status === 'PRESENT') {
            if (rec.verificationMethod === 'TRAVELLING_SESSION_PARTICIPATION') {
              travellingCount++;
            } else {
              groundCount++;
            }
            return true;
          }
          return false;
        });

        const present = presentStudents.length;
        const notPresent = Math.max(0, total - present);
        const percentage = total > 0 ? Math.round((present / total) * 10000) / 100 : 0;

        return {
          busId: bus.id,
          busNumber: bus.busNumber,
          routeName: bus.routeName,
          total,
          present,
          notPresent,
          percentage,
          groundCount,
          travellingCount,
        };
      });

    const totalStudents = eligibleStudents.length;
    const present = studentWise.filter((s) => s.status === 'PRESENT').length;
    const notPresent = Math.max(0, totalStudents - present);
    const percentage =
      totalStudents > 0 ? Math.round((present / totalStudents) * 10000) / 100 : 0;

    const report: FinalReport = {
      id: `REP-${date.replace(/-/g, '')}-${sessionType}`,
      date,
      sessionType,
      totalStudents,
      present,
      notPresent,
      percentage,
      busWise,
      studentWise,
      generatedAt: new Date().toISOString(),
    };

    // Save report in persistent PostgreSQL storage
    await this.storage.saveReport(report);

    // Create Admin In-App Notification
    await this.storage.createNotification({
      title: `🔔 ${sessionType === 'MORNING' ? 'Morning' : 'Evening'} Bus Attendance Report`,
      message: `${sessionType} attendance finalized for ${date}. Total Eligible: ${totalStudents}, Present: ${present}, Absent: ${notPresent}, Turnout: ${percentage}%`,
      type: 'REPORT',
      date,
      read: false,
      link: `/admin/reports`,
      metadata: {
        totalStudents,
        present,
        notPresent,
        percentage,
        sessionType,
        reportId: report.id,
      },
    });

    return report;
  }
}
