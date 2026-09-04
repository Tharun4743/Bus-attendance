import { AttendanceSettings, SessionInfo, SessionStatus } from '../../types';

/**
 * Gets the current time in Asia/Kolkata (IST).
 */
export function getCurrentISTDate(): Date {
  const now = new Date();
  // Format to Asia/Kolkata representation
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
}

/**
 * Formats date into YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function getISTDateString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // Returns YYYY-MM-DD
}

/**
 * Formats time into HH:mm:ss in Asia/Kolkata timezone.
 */
export function getISTTimeString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(d); // Returns HH:mm:ss
}

/**
 * Helper to convert "HH:mm" or "HH:mm:ss" into minutes from start of day.
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Evaluates current session status based on settings and server IST time.
 */
export function evaluateSessionStatus(settings: AttendanceSettings): SessionInfo {
  let currentTimeStr = getISTTimeString();
  let currentDateStr = getISTDateString();
  let isSimulated = false;

  // Support Admin Simulation / Test mode
  if (settings.simulation?.enabled && settings.simulation.simulatedTime) {
    currentTimeStr = `${settings.simulation.simulatedTime}:00`.slice(0, 8);
    isSimulated = true;
  }

  const currentMinutes = timeToMinutes(currentTimeStr);
  const startMinutes = timeToMinutes(settings.startTime); // e.g. 16:50 = 1010
  const endMinutes = timeToMinutes(settings.endTime); // e.g. 16:55 = 1015
  const reportMinutes = timeToMinutes(settings.reportTime || '16:57'); // e.g. 16:57 = 1017

  let status: SessionStatus = 'UPCOMING';

  if (currentMinutes < startMinutes) {
    status = 'UPCOMING';
  } else if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    status = 'ACTIVE';
  } else if (currentMinutes >= endMinutes && currentMinutes < reportMinutes) {
    status = 'CLOSED';
  } else {
    status = 'FINALIZED';
  }

  return {
    sessionType: 'EVENING',
    attendanceMode: 'GROUND',
    status,
    startTime: settings.startTime,
    endTime: settings.endTime,
    reportTime: settings.reportTime || '16:57',
    timezone: settings.timezone,
    currentTimeIST: currentTimeStr,
    currentDateIST: currentDateStr,
    locationName: settings.location.name,
    radiusMeters: settings.location.radiusMeters,
    maxGpsAccuracyMeters: settings.location.maxGpsAccuracyMeters,
    isSimulated,
  };
}
