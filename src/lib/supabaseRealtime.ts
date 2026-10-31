import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn('⚠️ [SupabaseRealtime] Client initialization deferred:', err);
  }
}

export function getSupabaseRealtimeClient(): SupabaseClient | null {
  return supabaseClient;
}

/**
 * Subscribes to real-time changes on the public.notifications table.
 * Automatically notifies the active dashboard without requiring external push services.
 */
export function subscribeToNotifications(onNotification: (payload: any) => void): (() => void) {
  if (!supabaseClient) {
    return () => {};
  }

  const channel = supabaseClient
    .channel('public:notifications')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        onNotification(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabaseClient?.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on the public.active_sessions table.
 * Allows student and in-charge dashboards to unlock instantly when attendance opens.
 */
export function subscribeToSessionChanges(onSessionChange: (payload: any) => void): (() => void) {
  if (!supabaseClient) {
    return () => {};
  }

  const channel = supabaseClient
    .channel('public:active_sessions')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'active_sessions' },
      (payload) => {
        onSessionChange(payload);
      }
    )
    .subscribe();

  return () => {
    supabaseClient?.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on the public.attendance_records table.
 * Allows Incharge Live Attendance and Admin Live Monitoring to update instantly.
 */
export function subscribeToAttendanceChanges(onAttendanceChange: (payload: any) => void): (() => void) {
  if (!supabaseClient) {
    return () => {};
  }

  const channel = supabaseClient
    .channel('public:attendance_records')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance_records' },
      (payload) => {
        onAttendanceChange(payload);
      }
    )
    .subscribe();

  return () => {
    supabaseClient?.removeChannel(channel);
  };
}

