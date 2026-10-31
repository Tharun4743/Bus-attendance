import { StorageAdapter } from '../storage/StorageAdapter';
import { ReportGenerator } from '../reports/generator';
import { getISTDateString, getISTTimeString, timeToMinutes } from './session';

export interface ScheduleReconciliationResult {
  executedAt: string;
  timeIST: string;
  dateIST: string;
  autoScheduleEnabled: boolean;
  action: 'STARTED_SESSION' | 'CLOSED_SESSION' | 'FINALIZED_REPORT' | 'RECOVERED_SESSION' | 'IDLE';
  details?: string;
  sessionId?: string;
  reportId?: string;
}

/**
 * PostgreSQL-backed application-level evening scheduler reconciliation engine.
 * Evaluates operational schedule in Asia/Kolkata timezone:
 * - 4:50 PM IST (16:50): Starts evening attendance session for active buses if auto-schedule enabled.
 * - 4:55 PM IST (16:55): Closes evening attendance session idempotently.
 * - 4:57 PM IST (16:57): Generates final daily evening report and notifies Admin.
 *
 * Self-Healing Recovery:
 * If the application was idle during scheduled windows (serverless sleep), subsequent requests
 * evaluate missed states and idempotently reconcile sessions and finalize reports without data loss.
 */
export async function reconcileEveningSchedule(
  storage: StorageAdapter,
  reportGen: ReportGenerator,
  forceDate?: string,
  simulatedTime?: string
): Promise<ScheduleReconciliationResult> {
  const settings = await storage.getSettings();
  const tz = settings.timezone || 'Asia/Kolkata';
  const timeIST = simulatedTime || getISTTimeString(new Date(), tz);
  const dateIST = forceDate || getISTDateString(new Date(), tz);

  const startMinutes = timeToMinutes(settings.startTime || '16:50');
  const endMinutes = timeToMinutes(settings.endTime || '16:55');
  const reportMinutes = timeToMinutes(settings.reportTime || '16:57');
  const currentMinutes = timeToMinutes(timeIST);

  const autoScheduleEnabled = Boolean(settings.autoScheduleEnabled || settings.simulation?.enabled);

  // 1. Prior to 16:50 IST
  if (currentMinutes < startMinutes) {
    return {
      executedAt: new Date().toISOString(),
      timeIST,
      dateIST,
      autoScheduleEnabled,
      action: 'IDLE',
      details: `Current time ${timeIST} IST is prior to scheduled window (${settings.startTime} IST).`,
    };
  }

  // 2. Scheduled Start Window: [16:50, 16:55) IST
  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    if (!autoScheduleEnabled) {
      return {
        executedAt: new Date().toISOString(),
        timeIST,
        dateIST,
        autoScheduleEnabled,
        action: 'IDLE',
        details: 'Auto-scheduling is disabled. In-Charge manual start available.',
      };
    }

    // Check if active evening session already running for today
    const existingSession = await storage.getActiveSession();
    if (existingSession && existingSession.status === 'ACTIVE' && existingSession.sessionType === 'EVENING') {
      return {
        executedAt: new Date().toISOString(),
        timeIST,
        dateIST,
        autoScheduleEnabled,
        action: 'IDLE',
        details: `Active evening session ${existingSession.id} is already in progress.`,
      };
    }

    // Start evening session for active buses
    const buses = await storage.getBuses();
    const activeBuses = buses.filter((b) => b.active);
    const busId = activeBuses.length > 0 ? activeBuses[0].id : 'BUS01';
    const sessionId = `SCHED-EVENING-${dateIST.replace(/-/g, '')}-${busId}`;

    const newSession = await storage.saveActiveSession({
      id: sessionId,
      sessionType: 'EVENING',
      attendanceMode: 'GROUND',
      verificationMethod: 'GROUND_GEOFENCE',
      busId,
      status: 'ACTIVE',
      startedBy: 'Application-Level Schedule Engine',
      radiusMeters: settings.location?.radiusMeters || 10,
      maxGpsAccuracyMeters: settings.location?.maxGpsAccuracyMeters || 20,
      location: {
        type: 'FIXED',
        name: settings.location?.name || 'College Ground',
        latitude: settings.location?.latitude || 10.9572,
        longitude: settings.location?.longitude || 78.0766,
        accuracyMeters: 5,
        updatedAt: new Date().toISOString(),
      },
      startedAt: new Date().toISOString(),
      endedAt: null,
    });

    // Create persistent in-app notifications in PostgreSQL for eligible students
    const eligibleStudents = await storage.getStudents({ busId, status: 'APPROVED' });
    await storage.createNotification({
      title: '🚌 Scheduled Evening Attendance Started',
      message: `Evening attendance is now active at College Ground. Please verify within the 5-minute window.`,
      type: 'SESSION_START',
      date: dateIST,
      read: false,
      link: '/student/dashboard',
      busId,
      targetRole: 'STUDENT',
    });

    return {
      executedAt: new Date().toISOString(),
      timeIST,
      dateIST,
      autoScheduleEnabled,
      action: 'STARTED_SESSION',
      sessionId: newSession.id,
      details: `Evening attendance session started for ${busId} (${eligibleStudents.length} commuters notified).`,
    };
  }

  // 3. Scheduled Close Window: [16:55, 16:57) IST OR Recovery post-16:55
  const activeSession = await storage.getActiveSession();
  if (activeSession && activeSession.status === 'ACTIVE' && activeSession.sessionType === 'EVENING') {
    await storage.endActiveSession(activeSession.id);
    await storage.createNotification({
      title: '🚌 Evening Attendance Window Closed',
      message: `The evening attendance session has been finalized.`,
      type: 'SYSTEM',
      date: dateIST,
      read: false,
      link: '/student/dashboard',
      busId: activeSession.busId,
      targetRole: 'STUDENT',
    });

    // If also past report time, finalize report immediately in the same pass
    if (currentMinutes >= reportMinutes) {
      const finalReport = await reportGen.generateDailyReport(dateIST, 'EVENING');
      await storage.createNotification({
        title: '📊 Daily Evening Attendance Report Finalized',
        message: `Evening report: ${finalReport.present}/${finalReport.totalStudents} commuters present (${finalReport.percentage}%).`,
        type: 'REPORT',
        date: dateIST,
        read: false,
        link: '/admin/reports',
        targetRole: 'ADMIN',
      });

      return {
        executedAt: new Date().toISOString(),
        timeIST,
        dateIST,
        autoScheduleEnabled,
        action: 'RECOVERED_SESSION',
        sessionId: activeSession.id,
        reportId: finalReport.id,
        details: `Active session closed and report finalized during schedule reconciliation.`,
      };
    }

    return {
      executedAt: new Date().toISOString(),
      timeIST,
      dateIST,
      autoScheduleEnabled,
      action: 'CLOSED_SESSION',
      sessionId: activeSession.id,
      details: 'Active evening session closed idempotently at scheduled close boundary.',
    };
  }

  // 4. Scheduled Report Window: >= 16:57 IST
  if (currentMinutes >= reportMinutes) {
    const finalReport = await reportGen.generateDailyReport(dateIST, 'EVENING');
    await storage.createNotification({
      title: '📊 Daily Evening Attendance Report Finalized',
      message: `Evening report: ${finalReport.present}/${finalReport.totalStudents} present (${finalReport.percentage}%).`,
      type: 'REPORT',
      date: dateIST,
      read: false,
      link: '/admin/reports',
      targetRole: 'ADMIN',
    });

    return {
      executedAt: new Date().toISOString(),
      timeIST,
      dateIST,
      autoScheduleEnabled,
      action: 'FINALIZED_REPORT',
      reportId: finalReport.id,
      details: `Daily evening report generated and Admin notified.`,
    };
  }

  return {
    executedAt: new Date().toISOString(),
    timeIST,
    dateIST,
    autoScheduleEnabled,
    action: 'IDLE',
    details: 'Schedule state is reconciled and up-to-date.',
  };
}

