import { StorageAdapter } from './StorageAdapter';
import { PostgresStorageAdapter } from './PostgresStorageAdapter';
import { MemoryStorageAdapter } from './MemoryStorageAdapter';

let instance: StorageAdapter | null = null;

/**
 * Storage Provider Factory:
 * Connects to live Supabase PostgreSQL via PostgresStorageAdapter.
 * Requires valid DATABASE_URL in production / standard environments and fails fast if initialization fails.
 * MemoryStorageAdapter is strictly restricted to test environments or explicit ALLOW_MEMORY_STORAGE=true.
 */
export function getStorage(): StorageAdapter {
  if (!instance) {
    const isTestMode =
      (process.env.NODE_ENV || '').trim() === 'test' ||
      (process.env.ALLOW_MEMORY_STORAGE || '').trim() === 'true' ||
      Boolean(process.env.VITEST);

    if (process.env.DATABASE_URL) {
      try {
        instance = new PostgresStorageAdapter();
      } catch (err: any) {
        if (isTestMode) {
          console.warn('⚠️ [Storage] Failed to initialize PostgresStorageAdapter, falling back to MemoryStorageAdapter for test environment:', err?.message || err);
          instance = new MemoryStorageAdapter();
        } else {
          console.error('🚨 [Storage Error] Failed to initialize PostgresStorageAdapter:', err?.message || err);
          throw new Error(`DATABASE INITIALIZATION FAILED: ${err?.message || err}. Production requires a valid Supabase PostgreSQL connection.`);
        }
      }
    } else {
      if (isTestMode) {
        console.warn('⚠️ [Storage] DATABASE_URL is not configured. Using MemoryStorageAdapter for local test suite only.');
        instance = new MemoryStorageAdapter();
      } else {
        throw new Error('CRITICAL CONFIGURATION ERROR: DATABASE_URL is missing in environment variables. MemoryStorageAdapter fallback is prohibited in production.');
      }
    }
  }
  return instance;
}

/**
 * Helper to allow unit test harnesses to inject a mock or memory storage instance cleanly.
 */
export function setStorageInstance(customInstance: StorageAdapter | null): void {
  instance = customInstance;
}

export * from './StorageAdapter';
export * from './PostgresStorageAdapter';
export * from './MemoryStorageAdapter';
