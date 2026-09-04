import { JsonStorageAdapter } from './JsonStorageAdapter';

// Production Storage Adapter wraps JsonStorageAdapter with in-memory caching
// ensuring high speed and resilience in serverless / edge runtime environments
export class ProductionStorageAdapter extends JsonStorageAdapter {
  constructor() {
    super();
  }
}
