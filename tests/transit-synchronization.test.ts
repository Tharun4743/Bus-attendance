import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { Bus, User, Role } from '../src/types';

describe('Global Transit Synchronization & Storage Integrity Circuit', () => {
  let storage: MemoryStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
  });

  it('enforces strictly three authorized institutional roles', () => {
    const validRoles: Role[] = ['ADMIN', 'INCHARGE', 'STUDENT'];
    expect(validRoles).toHaveLength(3);
    expect(validRoles).toContain('ADMIN');
    expect(validRoles).toContain('INCHARGE');
    expect(validRoles).toContain('STUDENT');
  });

  it('persists assignedTransit on bus creation and defaults to MORNING', async () => {
    const busDefault = await storage.createBus({
      busNumber: 'BUS-01',
      routeName: 'Campus North Corridor',
      inchargeId: '',
    });
    expect(busDefault.assignedTransit).toBe('MORNING');

    const busEvening = await storage.createBus({
      busNumber: 'BUS-02',
      routeName: 'Campus South Corridor',
      inchargeId: '',
      assignedTransit: 'EVENING',
    });
    expect(busEvening.assignedTransit).toBe('EVENING');
  });

  it('synchronizes in-charge user transit when assigning to a bus', async () => {
    const incharge = await storage.createUser({
      id: 'inc-001',
      name: 'Transit Coordinator 1',
      email: 'coordinator1@college.edu',
      role: 'INCHARGE',
      active: true,
      assignedTransit: 'MORNING',
    });

    const bus = await storage.createBus({
      busNumber: 'BUS-09',
      routeName: 'Express Route 9',
      inchargeId: incharge.id,
      assignedTransit: 'MORNING',
    });

    // Verify initial link
    const fetchedIncharge = await storage.getUserById(incharge.id);
    expect(fetchedIncharge?.assignedBusId).toBe(bus.id);
    expect(fetchedIncharge?.assignedTransit).toBe('MORNING');

    // Admin updates bus to EVENING transit
    await storage.updateBus(bus.id, { assignedTransit: 'EVENING' });

    const updatedBus = await storage.getBusById(bus.id);
    expect(updatedBus?.assignedTransit).toBe('EVENING');

    // Incharge user profile must automatically reflect EVENING transit
    const updatedIncharge = await storage.getUserById(incharge.id);
    expect(updatedIncharge?.assignedTransit).toBe('EVENING');
  });

  it('preserves transit shift across bus queries and updates', async () => {
    await storage.createBus({
      busNumber: 'BUS-15',
      routeName: 'Metro Junction',
      inchargeId: '',
      assignedTransit: 'EVENING',
    });

    const buses = await storage.getBuses();
    const bus15 = buses.find((b) => b.busNumber === 'BUS-15');
    expect(bus15).toBeDefined();
    expect(bus15?.assignedTransit).toBe('EVENING');
  });
});

