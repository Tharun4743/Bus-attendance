import { StorageAdapter } from './StorageAdapter';
import { PostgresStorageAdapter } from './PostgresStorageAdapter';

let instance: StorageAdapter | null = null;

/**
 * Storage Provider Factory:
 * ALWAYS stores and queries from Supabase PostgreSQL via PostgresStorageAdapter.
 * Zero reliance on local JSON files.
 */
export function getStorage(): StorageAdapter {
  if (!instance) {
    instance = new PostgresStorageAdapter();
  }
  return instance;
}

export * from './StorageAdapter';
export * from './PostgresStorageAdapter';
