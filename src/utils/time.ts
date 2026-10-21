/**
 * Authoritative Indian Standard Time (IST, UTC+5:30) Time Utility
 * Guarantees that all timestamps, reports, exports, and live monitors strictly conform to Asia/Kolkata.
 */

export const INDIAN_TIMEZONE = 'Asia/Kolkata';

export function formatISTTime(
  dateStrOrObj?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStrOrObj) return '';
  const d = new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    timeZone: INDIAN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: options?.second,
    hour12: options?.hour12 ?? true,
    ...options,
  });
}

export function formatISTTime24(
  dateStrOrObj?: string | number | Date | null
): string {
  if (!dateStrOrObj) return '';
  const d = new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', {
    timeZone: INDIAN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatISTDate(
  dateStrOrObj?: string | number | Date | null
): string {
  if (!dateStrOrObj) return '';
  const d = new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    timeZone: INDIAN_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatISTDateTime(
  dateStrOrObj?: string | number | Date | null
): string {
  if (!dateStrOrObj) return '';
  const d = new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return '';
  return `${formatISTDate(d)} at ${formatISTTime(d)}`;
}

/**
 * Returns YYYY-MM-DD strictly formatted in Asia/Kolkata (Indian Standard Time).
 */
export function getISTDateString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

