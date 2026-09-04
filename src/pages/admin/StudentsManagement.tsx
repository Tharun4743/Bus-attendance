import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bus as BusIcon,
} from 'lucide-react';

export const StudentsManagement: React.FC = () => {
  const [students, setStudents] = useState<(Student & { bus: Bus | null })[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBus, setSelectedBus] = useState<string>('ALL');
  const [selectedActive, setSelectedActive] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [regNo, setRegNo] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [busId, setBusId] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      const [stuRes, busRes] = await Promise.all([
        api.getStudents({ search: searchTerm, busId: selectedBus, active: selectedActive }),
        api.getBuses(),
      ]);
      setStudents(stuRes);
      setBuses(busRes);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, selectedBus, selectedActive]);

  const handleOpenAddModal = () => {
    if (buses.length === 0) {
      alert('Please configure at least one Bus in the Bus Management page before adding students.');
      return;
    }
    setEditingStudent(null);
    setRegNo('');
    setName('');
    setEmail('');
    setPhone('');
    setBusId(buses[0]?.id || '');
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (stu: Student) => {
    setEditingStudent(stu);
    setRegNo(stu.registerNumber);
    setName(stu.name);
    setEmail(stu.email);
    setPhone(stu.phone);
    setBusId(stu.busId);
    setActive(stu.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim() || !name.trim() || !busId) {
      setFormError('Register number, student name, and assigned bus are required.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, {
          registerNumber: regNo.trim().toUpperCase(),
          name: name.trim(),
          email: email.trim() || `${regNo.toLowerCase()}@example.com`,
          phone: phone.trim(),
          busId,
          active,
        });
      } else {
        await api.createStudent({
          registerNumber: regNo.trim().toUpperCase(),
          name: name.trim(),
          email: email.trim() || `${regNo.toLowerCase()}@example.com`,
          phone: phone.trim(),
          busId,
          active,
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (stu: Student) => {
    try {
      await api.updateStudent(stu.id, { active: !stu.active });
      fetchData();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student record?')) {
      try {
        await api.deleteStudent(id);
        fetchData();
      } catch (err) {
        console.error('Failed to delete student:', err);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Student Management
          </h1>
          <p className="text-[11px] text-amber-900/70 font-medium">
            Register students, manage active transport status, and assign buses.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Student</span>
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-[#EAE2D2] shadow-sm flex flex-col sm:flex-row gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, register number or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0]/40 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
          />
        </div>

        {/* Bus Filter */}
        <select
          value={selectedBus}
          onChange={(e) => setSelectedBus(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0]/40 font-medium text-slate-700 outline-none"
        >
          <option value="ALL">All Buses</option>
          {buses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.busNumber} ({b.routeName})
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedActive}
          onChange={(e) => setSelectedActive(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0]/40 font-medium text-slate-700 outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE2D2] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-7 h-7 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading student directory...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="No students added yet"
              description="No student records match your search criteria. Add a new student to get started."
              actionText="Add Student"
              onAction={handleOpenAddModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#FAF7F0] text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-[#EAE2D2]">
                <tr>
                  <th className="px-4 py-3">Register Number</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Email / Phone</th>
                  <th className="px-4 py-3">Assigned Bus</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE2D2]/50">
                {students.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-800">
                      {stu.registerNumber}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{stu.name}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-700">{stu.email}</p>
                      {stu.phone && <p className="text-[10px] text-slate-400">{stu.phone}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <BusIcon className="w-3.5 h-3.5 text-brand-600" />
                        <span>{stu.bus ? stu.bus.busNumber : stu.busId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {stu.active ? (
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
                          onClick={() => handleToggleActive(stu)}
                          title={stu.active ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg border transition ${
                            stu.active
                              ? 'text-amber-600 hover:bg-amber-50 border-amber-200'
                              : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          {stu.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(stu)}
                          title="Edit Student"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(stu.id)}
                          title="Delete Student"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Student Details' : 'Add New Student'}
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Register Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 24IT001"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Student Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tarun Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Bus *
            </label>
            <select
              value={busId}
              onChange={(e) => setBusId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none font-medium"
            >
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.busNumber} — {b.routeName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="studentActive"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
            />
            <label htmlFor="studentActive" className="text-xs font-bold text-slate-700">
              Active Transport Student
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
              {isSubmitting ? 'Saving...' : editingStudent ? 'Update Student' : 'Save Student'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
