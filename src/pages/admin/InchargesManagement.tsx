import { AdminInchargesSkeleton } from '../../components/skeleton/AdminSkeletons';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, User } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  UserX,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';

export const InchargesManagement: React.FC = () => {
  const [incharges, setIncharges] = useState<User[]>([]);
  const [pendingIncharges, setPendingIncharges] = useState<User[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Incharge Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addName, setAddName] = useState<string>('');
  const [addEmail, setAddEmail] = useState<string>('');
  const [addPhone, setAddPhone] = useState<string>('');
  const [addPassword, setAddPassword] = useState<string>('');
  const [showAddPassword, setShowAddPassword] = useState<boolean>(false);
  const [addBusId, setAddBusId] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Edit / Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [selectedIncharge, setSelectedIncharge] = useState<User | null>(null);
  const [assignedBusId, setAssignedBusId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [allIncharges, pendingRes, allBuses] = await Promise.all([
        api.getIncharges(),
        api.getPendingIncharges(),
        api.getBuses(),
      ]);
      setIncharges(allIncharges || []);
      setPendingIncharges(pendingRes?.incharges || []);
      setBuses(allBuses || []);
    } catch (err: any) {
      console.error('Failed to load incharges:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (userId: string, busNumber?: string) => {
    try {
      await api.approveIncharge(userId, busNumber);
      setFeedback({ type: 'success', message: 'In-Charge approved successfully.' });
      await fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Approval failed.' });
    }
  };

  const handleReject = async (userId: string) => {
    if (!window.confirm('Are you sure you want to reject this In-Charge registration?')) return;
    try {
      await api.rejectIncharge(userId);
      setFeedback({ type: 'success', message: 'In-Charge registration rejected.' });
      await fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Rejection failed.' });
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this In-Charge?')) return;
    try {
      await api.deactivateIncharge(userId);
      setFeedback({ type: 'success', message: 'In-Charge deactivated.' });
      await fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Deactivation failed.' });
    }
  };

  const handleOpenAssign = (incharge: User) => {
    setSelectedIncharge(incharge);
    setAssignedBusId(incharge.assignedBusId || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncharge || !assignedBusId) return;
    setIsSubmitting(true);
    try {
      await api.assignIncharge(selectedIncharge.id, assignedBusId);
      setFeedback({ type: 'success', message: 'Bus assignment updated successfully.' });
      setIsAssignModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Assignment failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateIncharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) {
      setFeedback({ type: 'error', message: 'Name, email, and password are required.' });
      return;
    }
    setIsAdding(true);
    try {
      await api.createIncharge({
        name: addName.trim(),
        email: addEmail.trim().toLowerCase(),
        phone: addPhone.trim() || undefined,
        password: addPassword.trim(),
        assignedBusId: addBusId || undefined,
      });
      setFeedback({ type: 'success', message: 'In-Charge created successfully.' });
      setIsAddModalOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPhone('');
      setAddPassword('');
      setAddBusId('');
      await fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to register In-Charge.' });
    } finally {
      setIsAdding(false);
    }
  };

  const busMap = new Map(buses.map((b) => [b.id, b]));

  const filteredIncharges = incharges.filter((inc) => {
    const q = searchTerm.toLowerCase();
    const bus = busMap.get(inc.assignedBusId || '');
    return (
      inc.name.toLowerCase().includes(q) ||
      inc.email.toLowerCase().includes(q) ||
      (inc.phone && inc.phone.includes(q)) ||
      (bus && bus.busNumber.toLowerCase().includes(q))
    );
  });

  if (isLoading && incharges.length === 0) {
    return <AdminInchargesSkeleton />;
  }

  return (
    <div className="space-y-4 w-full mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="blue">FLEET MANAGEMENT</Badge>
            <span className="text-xs font-mono font-bold text-zinc-400">
              {incharges.length} Registered Operators
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Bus In-Charge Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Authorize transport coordinators, review registration requests, and link in-charges to fleet buses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="secondary" size="sm">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} variant="primary" size="sm">
            <Plus className="w-3.5 h-3.5" />
            <span>Add In-Charge</span>
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-[#4ade80]'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-[#fb7185]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-[#fb7185]" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold uppercase opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-[#26262e] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'ACTIVE'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#1a1a20]'
          }`}
        >
          Active In-Charges ({incharges.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'PENDING'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#1a1a20]'
          }`}
        >
          <span>Pending Registrations</span>
          {pendingIncharges.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
              {pendingIncharges.length}
            </span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e]">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
          <p className="text-xs font-medium text-zinc-500">Loading in-charges roster...</p>
        </div>
      ) : activeTab === 'ACTIVE' ? (
        /* ACTIVE INCHARGES LIST */
        <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] overflow-hidden shadow-xs">
          {/* Search Bar */}
          <div className="p-3.5 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014]">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, phone or bus..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-[#2a2a34] rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {filteredIncharges.length === 0 ? (
            <EmptyState
              title="No In-Charges Found"
              description="No active bus in-charges match your current search query."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                  <tr>
                    <th className="px-5 py-3.5">In-Charge Name</th>
                    <th className="px-5 py-3.5">Contact</th>
                    <th className="px-5 py-3.5">Assigned Bus</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                  {filteredIncharges.map((inc) => {
                    const bus = busMap.get(inc.assignedBusId || '');
                    return (
                      <tr key={inc.id} className="hover:bg-zinc-50/60 dark:hover:bg-[#181820] transition">
                        <td className="px-5 py-4">
                          <p className="font-bold text-zinc-900 dark:text-white">{inc.name}</p>
                          <p className="text-[11px] font-mono text-zinc-400">{inc.id}</p>
                        </td>
                        <td className="px-5 py-4 space-y-0.5">
                          <p className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                            <Mail className="w-3 h-3 text-zinc-400" />
                            <span>{inc.email}</span>
                          </p>
                          {inc.phone && (
                            <p className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                              <Phone className="w-3 h-3 text-zinc-400" />
                              <span>{inc.phone}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {bus ? (
                            <div>
                              <span className="font-bold text-purple-700 dark:text-[#c084fc]">
                                {bus.busNumber}
                              </span>
                              <p className="text-[10px] text-zinc-400">{bus.routeName}</p>
                            </div>
                          ) : (
                            <span className="text-zinc-400 font-mono text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#4ade80]">
                            Active
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenAssign(inc)}
                              className="px-2.5 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition"
                            >
                              Assign Bus
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeactivate(inc.id)}
                              className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                              title="Deactivate"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* PENDING INCHARGES LIST */
        <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] overflow-hidden shadow-xs">
          {pendingIncharges.length === 0 ? (
            <EmptyState
              title="No Pending In-Charges"
              description="There are currently zero pending bus in-charge registrations awaiting approval."
            />
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-[#26262e]">
              {pendingIncharges.map((inc) => (
                <div key={inc.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{inc.name}</h3>
                    <p className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                      <span>{inc.email}</span>
                      {inc.phone && <span>• {inc.phone}</span>}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-1">
                      Requested Vehicle: {inc.assignedBusId || 'Not specified'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <Button
                      onClick={() => handleApprove(inc.id, inc.assignedBusId)}
                      variant="primary"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </Button>
                    <Button
                      onClick={() => handleReject(inc.id)}
                      variant="danger"
                      size="sm"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign Bus Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Bus to In-Charge"
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          <div className="p-3 bg-zinc-50 dark:bg-[#181820] rounded-xl text-xs space-y-1">
            <p className="font-bold text-zinc-900 dark:text-white">{selectedIncharge?.name}</p>
            <p className="text-zinc-500">{selectedIncharge?.email}</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Select Fleet Bus *
            </label>
            <select
              required
              value={assignedBusId}
              onChange={(e) => setAssignedBusId(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-white dark:bg-[#101014] text-zinc-900 dark:text-white outline-none font-bold"
            >
              <option value="">-- Choose Bus --</option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.busNumber} — {b.routeName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-[#26262e]">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !assignedBusId} variant="primary" size="sm">
              {isSubmitting ? 'Saving...' : 'Confirm Assignment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Register New In-Charge Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Bus In-Charge"
      >
        <form onSubmit={handleCreateIncharge} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-white dark:bg-[#101014] text-zinc-900 dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. incharge@college.edu"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-white dark:bg-[#101014] text-zinc-900 dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Contact Phone
            </label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-white dark:bg-[#101014] text-zinc-900 dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Initial Password *
            </label>
            <div className="relative">
              <input
                type={showAddPassword ? 'text' : 'password'}
                required
                placeholder="Minimum 6 characters"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                className="w-full h-10 pl-3 pr-10 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-white dark:bg-[#101014] text-zinc-900 dark:text-white outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAddPassword((prev) => !prev)}
                className="absolute right-3 top-2.5 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none"
                aria-label={showAddPassword ? 'Hide password' : 'Show password'}
                title={showAddPassword ? 'Hide password' : 'Show password'}
              >
                {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Assigned Fleet Bus (Optional)
            </label>
            <select
              value={addBusId}
              onChange={(e) => setAddBusId(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-white dark:bg-[#101014] text-zinc-900 dark:text-white outline-none font-bold"
            >
              <option value="">-- Assign Later / Unassigned --</option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.busNumber} — {b.routeName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-[#26262e]">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding} variant="primary" size="sm">
              {isAdding ? 'Creating...' : 'Register In-Charge'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
