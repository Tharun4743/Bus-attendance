import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <Badge variant="blue" className="mb-2">
            STUDENT DIRECTORY
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Student Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Register students, manage active transport status, and assign buses.
          </p>
        </div>

        <Button
          onClick={handleOpenAddModal}
          variant="primary"
          size="md"
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student</span>
        </Button>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white dark:bg-[#141418] p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs flex flex-col sm:flex-row gap-3 transition-all">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, register number or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-3.5 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-[#141418] outline-none"
          />
        </div>

        {/* Bus Filter */}
        <select
          value={selectedBus}
          onChange={(e) => setSelectedBus(e.target.value)}
          className="h-10 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white outline-none"
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
          className="h-10 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Student List Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Loading student directory...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-6 sm:p-8">
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
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Register Number</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Email / Phone</th>
                  <th className="px-5 py-3.5">Assigned Bus</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {students.map((stu) => (
                  <tr key={stu.id} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                    <td className="px-5 py-4 font-bold font-mono text-blue-600 dark:text-sky-400">
                      {stu.registerNumber}
                    </td>
                    <td className="px-5 py-4 font-bold text-zinc-900 dark:text-white">{stu.name}</td>
                    <td className="px-5 py-4">
                      <p className="text-zinc-700 dark:text-zinc-300 font-medium">{stu.email}</p>
                      {stu.phone && <p className="text-[10px] text-zinc-400">{stu.phone}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                        <BusIcon className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                        <span>{stu.bus ? stu.bus.busNumber : stu.busId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {stu.active ? (
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
                          onClick={() => handleToggleActive(stu)}
                          title={stu.active ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-xl border transition active:scale-95 cursor-pointer ${
                            stu.active
                              ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-900/40'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40'
                          }`}
                        >
                          {stu.active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(stu)}
                          title="Edit Student"
                          className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#202028] border border-zinc-200 dark:border-[#26262e] transition active:scale-95 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(stu.id)}
                          title="Delete Student"
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 transition active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 flex items-center gap-2 text-rose-700 dark:text-[#fb7185] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Register Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 24IT001"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              className="w-full h-10 px-3.5 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none uppercase font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Student Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tarun Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3.5 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3.5 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3.5 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Assigned Bus *
            </label>
            <select
              value={busId}
              onChange={(e) => setBusId(e.target.value)}
              required
              className="w-full h-10 px-3.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
            >
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.busNumber} — {b.routeName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="studentActive"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded-lg text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <label htmlFor="studentActive" className="text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
              Active Transport Student
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
              {isSubmitting ? 'Saving...' : editingStudent ? 'Update Student' : 'Save Student'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
