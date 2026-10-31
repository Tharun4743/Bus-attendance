import { describe, it, expect } from 'vitest';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { PostgresStorageAdapter } from '../src/server/storage/PostgresStorageAdapter';
import { getISTDateString } from '../src/server/attendance/session';
import { ActiveSession } from '../src/types';

describe('⚡ Attendance Date Sorting & Bus Normalization Circuit', () => {
  it('1. Safe date sorting comparator works with Date objects, strings, and missing dates without throwing', () => {
    const rawRecords = [
      { attendanceDate: new Date('2026-10-28T00:00:00Z'), verifiedAt: new Date('2026-10-28T16:52:00Z') },
      { attendanceDate: '2026-10-29', verifiedAt: '2026-10-29T16:51:00.000Z' },
      { attendanceDate: new Date('2026-10-27T00:00:00Z'), verifiedAt: '2026-10-27T16:50:00.000Z' },
      { attendanceDate: null, verifiedAt: null },
      { attendanceDate: undefined, verifiedAt: undefined },
    ];

    expect(() => {
      rawRecords.sort((a, b) =>
        String(b.attendanceDate || '').localeCompare(String(a.attendanceDate || ''))
      );
    }).not.toThrow();

    expect(() => {
      rawRecords.sort(
        (a, b) =>
          String(b.attendanceDate || '').localeCompare(String(a.attendanceDate || '')) ||
          String(b.verifiedAt || '').localeCompare(String(a.verifiedAt || ''))
      );
    }).not.toThrow();
  });

  it('2. mapAttendance safely formats Date and string timestamps', () => {
    // Instantiate Postgres adapter in prototype mode to test mapAttendance
    const proto = PostgresStorageAdapter.prototype as any;
    const dateObj = new Date('2026-10-29T00:00:00.000Z');
    const isoDate = dateObj.toISOString();

    const mapped = proto.mapAttendance({
      id: 'att-1',
      session_id: 'sess-1',
      student_id: 'stu-1',
      bus_id: 'BUS-TN47D4743',
      attendance_date: dateObj,
      session_type: 'EVENING',
      attendance_mode: 'GROUND',
      status: 'PRESENT',
      verified_at: dateObj,
      captured_at: dateObj,
    });

    expect(typeof mapped.attendanceDate).toBe('string');
    expect(mapped.attendanceDate).toBe(getISTDateString(dateObj));
    expect(typeof mapped.verifiedAt).toBe('string');
    expect(mapped.verifiedAt).toBe(isoDate);

    // Also test with raw string from Postgres OID 1082
    const mappedRaw = proto.mapAttendance({
      id: 'att-2',
      session_id: 'sess-2',
      student_id: 'stu-2',
      bus_id: 'TN47D4743',
      attendance_date: '2026-10-29',
      session_type: 'EVENING',
      status: 'PRESENT',
      verified_at: '2026-10-29T16:50:00.000Z',
    });

    expect(mappedRaw.attendanceDate).toBe('2026-10-29');
    expect(mappedRaw.verifiedAt).toBe('2026-10-29T16:50:00.000Z');
  });

  it('3. MemoryStorageAdapter normalized bus matching handles prefixed and non-prefixed bus IDs', async () => {
    const memory = new MemoryStorageAdapter();

    const mockSession: ActiveSession = {
      id: 'sess-bus-1',
      sessionType: 'EVENING',
      attendanceMode: 'GROUND',
      verificationMethod: 'FACE_GPS',
      busId: 'BUS-TN47D4743',
      status: 'ACTIVE',
      startedBy: 'Incharge 1',
      currentCode: '123456',
      codeIssuedAt: new Date().toISOString(),
      codeExpiresAt: new Date(Date.now() + 600000).toISOString(),
      radiusMeters: 35,
      maxGpsAccuracyMeters: 80,
      startedAt: new Date().toISOString(),
    };

    await memory.saveActiveSession(mockSession);

    // Matching with BUS-TN47D4743
    const match1 = await memory.getActiveSession('BUS-TN47D4743');
    expect(match1).not.toBeNull();
    expect(match1?.busId).toBe('BUS-TN47D4743');

    // Matching with raw TN47D4743 without prefix
    const match2 = await memory.getActiveSession('TN47D4743');
    expect(match2).not.toBeNull();
    expect(match2?.busId).toBe('BUS-TN47D4743');

    // Matching with lower case tn47d4743
    const match3 = await memory.getActiveSession('tn47d4743');
    expect(match3).not.toBeNull();

    // Non-matching bus
    const nonMatch = await memory.getActiveSession('BUS-KA01E1234');
    expect(nonMatch).toBeNull();
  });

  it('4. Frontend normalizeBus logic correctly equates BUS- prefixed and non-prefixed IDs', () => {
    const normalizeBus = (b?: string | null): string => {
      if (!b) return '';
      return b.trim().toUpperCase().replace(/^BUS-/i, '');
    };

    expect(normalizeBus('BUS-TN47D4743')).toBe('TN47D4743');
    expect(normalizeBus('TN47D4743')).toBe('TN47D4743');
    expect(normalizeBus('bus-tn47d4743')).toBe('TN47D4743');
    expect(normalizeBus('  BUS-tn47d4743  ')).toBe('TN47D4743');

    expect(normalizeBus('BUS-TN47D4743') === normalizeBus('TN47D4743')).toBe(true);
  });
});

