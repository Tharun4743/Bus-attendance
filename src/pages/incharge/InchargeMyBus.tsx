import { InchargeMyBusSkeleton } from '../../components/skeleton/InchargeSkeletons';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Bus as BusIcon,
  RefreshCw,
  Search,
  CheckCircle2,
  Phone,
  Mail,
} from 'lucide-react';

export const InchargeMyBus: React.FC = () => {
  const [data, setData] = useState<{
    bus: Bus;
    totalStudents: number;
    capacity: number;
    activeStudents: Student[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchBus = async () => {
    try {
      setError(null);
      const res = await api.getInchargeMyBus();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned bus details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBus();
  }, []);

  const filteredStudents = (data?.activeStudents || []).filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.registerNumber.toLowerCase().includes(q);
  });

  if (isLoading && !data) {
    return <InchargeMyBusSkeleton />;
  }

  if (error || !data) {
    return (
      <EmptyState
        title="No Bus Assigned"
        description="Your in-charge account does not have an assigned fleet bus. Please contact an administrator."
      />
    );
  }

  return (
    <div className="space-y-5 w-full mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="blue">ASSIGNED TRANSIT VEHICLE</Badge>
            <span className="text-xs font-mono font-bold text-zinc-400">
              Fleet ID: {data.bus.id}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BusIcon className="w-6 h-6 text-blue-600 dark:text-sky-400" />
            <span>Bus {data.bus.busNumber}</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Route: <strong>{data.bus.routeName}</strong> • Authorized Daily Transit Fleet
          </p>
        </div>

        <Button onClick={fetchBus} variant="secondary" size="sm">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Registered Commuters
          </span>
          <span className="text-2xl font-black text-zinc-900 dark:text-white block">
            {data.totalStudents}
          </span>
          <span className="text-xs text-zinc-500">Active assigned students</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Vehicle Capacity
          </span>
          <span className="text-2xl font-black text-blue-600 dark:text-sky-400 block">
            {data.capacity || 60} Seats
          </span>
          <span className="text-xs text-zinc-500">Maximum authorized seating</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Capacity Load
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">
            {data.capacity ? Math.round((data.totalStudents / data.capacity) * 100) : 0}%
          </span>
          <span className="text-xs text-zinc-500">Allocated passenger utilization</span>
        </div>
      </div>

      {/* Assigned Student Commuter Roster */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
              Assigned Passenger Roster
            </h2>
            <p className="text-[10px] text-zinc-400">
              Students authorized to board Bus {data.bus.busNumber}
            </p>
          </div>

          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or register number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-[#2a2a34] rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <EmptyState
            title="No Commuters Found"
            description="No assigned students match your search filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[580px]">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Register No</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5 text-right">Commuter Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {filteredStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-zinc-50/60 dark:hover:bg-[#181820] transition">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600 dark:text-sky-400">
                      {stu.registerNumber}
                    </td>
                    <td className="px-5 py-3 font-bold text-zinc-900 dark:text-white">
                      {stu.name}
                    </td>
                    <td className="px-5 py-3 space-y-0.5 text-zinc-500">
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-zinc-400" />
                        <span>{stu.email}</span>
                      </p>
                      {stu.phone && (
                        <p className="flex items-center gap-1.5 text-[11px]">
                          <Phone className="w-3 h-3 text-zinc-400" />
                          <span>{stu.phone}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#4ade80]">
                        <CheckCircle2 className="w-3 h-3" /> Active Commuter
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
