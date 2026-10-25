import { StorageAdapter } from './StorageAdapter';
import { PostgresStorageAdapter } from './PostgresStorageAdapter';
import { MemoryStorageAdapter } from './MemoryStorageAdapter';

let instance: StorageAdapter | null = null;

/**
 * Storage Provider Factory:
 * Connects to live Supabase PostgreSQL via PostgresStorageAdapter if DATABASE_URL is configured.
 * Seamlessly falls back to resilient MemoryStorageAdapter if DATABASE_URL is missing or fails to initialize in serverless environments (e.g. Vercel deployment without env vars).
 */
export function getStorage(): StorageAdapter {
  if (!instance) {
    if (process.env.DATABASE_URL) {
      try {
        instance = new PostgresStorageAdapter();
      } catch (err) {
        console.warn('⚠️ [Storage] Failed to initialize PostgresStorageAdapter, falling back to MemoryStorageAdapter:', err);
        instance = new MemoryStorageAdapter();
      }
    } else {
      console.warn('⚠️ [Storage] DATABASE_URL is not configured in environment variables. Falling back to MemoryStorageAdapter.');
      instance = new MemoryStorageAdapter();
    }
  }
  return instance;
}

export * from './StorageAdapter';
export * from './PostgresStorageAdapter';
export * from './MemoryStorageAdapter';

