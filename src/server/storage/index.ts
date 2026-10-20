import { StorageAdapter } from './StorageAdapter';
import { SupabaseStorageAdapter } from './SupabaseStorageAdapter';
import { ProductionStorageAdapter } from './ProductionStorageAdapter';

let instance: StorageAdapter | null = null;

/**
 * Storage Provider Factory:
 * Defaults to ProductionStorageAdapter (persisted in ./data/*.json).
 * Set STORAGE_DRIVER=supabase in .env when Supabase API keys are active.
 */
export function getStorage(): StorageAdapter {
  if (!instance) {
    if (process.env.STORAGE_DRIVER === 'supabase') {
      instance = new SupabaseStorageAdapter();
    } else {
      instance = new ProductionStorageAdapter();
    }
  }
  return instance;
}

export * from './StorageAdapter';
export * from './SupabaseStorageAdapter';
