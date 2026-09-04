import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Bus Fleet Management
          </h1>
          <p className="text-[11px] text-amber-900/70 font-medium">
            Configure transit routes, incharge assignments, and student capacities.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Bus</span>
        </button>
      </div>

      {/* Buses Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE2D2] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-7 h-7 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading buses...</p>
          </div>
        ) : buses.length === 0 ? (
          <div className="p-6">
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
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#FAF7F0] text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-[#EAE2D2]">
                <tr>
                  <th className="px-4 py-3">Bus Code</th>
                  <th className="px-4 py-3">Bus Number</th>
                  <th className="px-4 py-3">Route Description</th>
                  <th className="px-4 py-3">Assigned Incharge</th>
                  <th className="px-4 py-3">Active Students</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE2D2]/50">
                {buses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-bold font-mono text-brand-700">{bus.id}</td>
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900">
                      {bus.busNumber}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{bus.routeName}</td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {bus.inchargeName || 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                        <Users className="w-3 h-3 text-slate-500" />
                        {bus.studentsCount} Students
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {bus.active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleActive(bus)}
                          title={bus.active ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg border transition ${
                            bus.active
                              ? 'text-amber-600 hover:bg-amber-50 border-amber-200'
                              : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          {bus.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(bus)}
                          title="Edit Bus"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Bus Registration / Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. TN-01-A-1234"
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Route Name & Stops *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dharapuram"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Bus Incharge
            </label>
            <select
              value={inchargeId}
              onChange={(e) => setInchargeId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none font-medium"
            >
              <option value="INC006">Aarthi (INC006)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="busActive"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
            />
            <label htmlFor="busActive" className="text-xs font-bold text-slate-700">
              Active Bus in Daily Operation
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE2D2]/60">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-[#FAF7F0] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition shadow-sm disabled:opacity-70"
            >
              {isSubmitting ? 'Saving...' : editingBus ? 'Update Bus' : 'Save Bus'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
