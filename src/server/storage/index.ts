import { StorageAdapter } from './StorageAdapter';
import { SupabaseStorageAdapter } from './SupabaseStorageAdapter';

let instance: StorageAdapter | null = null;

/**
 * Authoritative Storage Provider:
 * 100% PostgreSQL via Supabase PostgREST client with Row-Level Security.
 */
export function getStorage(): StorageAdapter {
  if (!instance) {
    instance = new SupabaseStorageAdapter();
  }
  return instance;
}

export * from './StorageAdapter';
export * from './SupabaseStorageAdapter';
