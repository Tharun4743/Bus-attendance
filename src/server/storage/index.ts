import { StorageAdapter } from './StorageAdapter';
import { JsonStorageAdapter } from './JsonStorageAdapter';
import { ProductionStorageAdapter } from './ProductionStorageAdapter';

let instance: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!instance) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      instance = new ProductionStorageAdapter();
    } else {
      instance = new JsonStorageAdapter();
    }
  }
  return instance;
}

export * from './StorageAdapter';
export * from './JsonStorageAdapter';
export * from './ProductionStorageAdapter';
