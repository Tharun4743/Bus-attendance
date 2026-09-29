import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Bus as BusIcon, Plus, Edit2, CheckCircle, XCircle, Users, AlertCircle } from 'lucide-react';

export const BusesManagement: React.FC = () => {
  const [buses, setBuses] = useState<(Bus & { studentsCount: number; inchargeName: string })[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [busNumber, setBusNumber] = useState<string>('Bus No 6');
  const [routeName, setRouteName] = useState<string>('Dharapuram');
  const [inchargeId, setInchargeId] = useState<string>('INC006');
  const [active, setActive] = useState<boolean>(true);

  const fetchBuses = async () => {
    try {
      const res = await api.getBuses();
      setBuses(res);
    } catch (err) {
      console.error('Failed to load buses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const handleOpenAdd = () => {
    setEditingBus(null);
    setBusNumber('Bus No 6');
    setRouteName('Dharapuram');
    setInchargeId('INC006');
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bus: Bus) => {
    setEditingBus(bus);
    setBusNumber(bus.busNumber);
    setRouteName(bus.routeName);
    setInchargeId(bus.inchargeId);
    setActive(bus.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busNumber.trim() || !routeName.trim()) {
      setFormError('Bus number and route name are required.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingBus) {
        await api.updateBus(editingBus.id, {
          busNumber: busNumber.trim().toUpperCase(),
          routeName: routeName.trim(),
          inchargeId,
          active,
        });
      } else {
        await api.createBus({
          busNumber: busNumber.trim().toUpperCase(),
          routeName: routeName.trim(),
          inchargeId,
          active,
        });
      }
      setIsModalOpen(false);
      fetchBuses();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save bus.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (bus: Bus) => {
    try {
      await api.updateBus(bus.id, { active: !bus.active });
      fetchBuses();
    } catch (err) {
      console.error('Failed to toggle bus status:', err);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <Badge variant="blue" className="mb-2">
            FLEET MANAGEMENT
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Bus Fleet Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Configure transit routes, incharge assignments, and student capacities.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          variant="primary"
          size="md"
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Bus</span>
        </Button>
      </div>

      {/* Buses Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Loading buses...</p>
          </div>
        ) : buses.length === 0 ? (
          <div className="p-6 sm:p-8">
            <EmptyState
              icon={BusIcon}
              title="No buses configured"
              description="Add your first college transit bus route."
              actionText="Add Bus"
              onAction={handleOpenAdd}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Bus Code</th>
                  <th className="px-5 py-3.5">Bus Number</th>
                  <th className="px-5 py-3.5">Route Description</th>
                  <th className="px-5 py-3.5">Assigned Incharge</th>
                  <th className="px-5 py-3.5">Active Students</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {buses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                    <td className="px-5 py-4 font-bold font-mono text-blue-600 dark:text-sky-400">{bus.id}</td>
                    <td className="px-5 py-4 font-black font-mono text-zinc-900 dark:text-white">
                      {bus.busNumber}
                    </td>
                    <td className="px-5 py-4 font-bold text-zinc-800 dark:text-zinc-200">{bus.routeName}</td>
                    <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300 font-medium">
                      {bus.inchargeName || 'Unassigned'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-[#1a1a20] border border-zinc-200/80 dark:border-[#26262e] px-2.5 py-1 rounded-lg">
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        {bus.studentsCount} Students
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {bus.active ? (
                        <Badge variant="emerald">
                          <CheckCircle className="w-3 h-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="zinc">
                          <XCircle className="w-3 h-3" /> Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleActive(bus)}
                          title={bus.active ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-xl border transition active:scale-95 cursor-pointer ${
                            bus.active
                              ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-900/40'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40'
                          }`}
                        >
                          {bus.active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(bus)}
                          title="Edit Bus"
                          className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#202028] border border-zinc-200 dark:border-[#26262e] transition active:scale-95 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Bus Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBus ? 'Edit Bus Route' : 'Add New Bus'}
      >
        <form onSubmit={handleSaveBus} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 flex items-center gap-2 text-rose-700 dark:text-[#fb7185] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Bus Registration / Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. TN-01-A-1234"
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              className="w-full h-11 px-4 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none uppercase"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Route Name & Stops *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dharapuram"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              className="w-full h-11 px-4 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Assigned Bus Incharge
            </label>
            <select
              value={inchargeId}
              onChange={(e) => setInchargeId(e.target.value)}
              className="w-full h-11 px-4 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
            >
              <option value="INC006">Aarthi (INC006)</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="busActive"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded-lg text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <label htmlFor="busActive" className="text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
              Active Bus in Daily Operation
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-[#26262e]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              size="sm"
            >
              {isSubmitting ? 'Saving...' : editingBus ? 'Update Bus' : 'Save Bus'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
