import { StudentMyBusSkeleton } from '../../components/skeleton/StudentSkeletons';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Bus as BusIcon,
  MapPin,
  UserCheck,
  Mail,
  Phone,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const StudentMyBus: React.FC = () => {
  const [data, setData] = useState<{
    bus: Bus;
    incharge: { name: string; email: string; phone?: string } | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchBus = async () => {
    try {
      setIsLoading(true);
      const res = await api.getStudentMyBus();
      setData(res);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Failed to load assigned bus details:', err);
      setErrorMessage(err?.message || 'No assigned bus found for your student profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBus();
  }, []);

  if (isLoading && !data) {
    return <StudentMyBusSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400">
            <BusIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              My Designated Bus Fleet
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Assigned transportation route and designated bus in-charge
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchBus}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-sky-400" />
          <p className="text-xs font-medium text-zinc-500">Retrieving bus assignments...</p>
        </div>
      ) : errorMessage || !data?.bus ? (
        <div className="p-8 bg-zinc-50 dark:bg-[#18181b] border border-dashed border-zinc-300 dark:border-[#27272a] rounded-2xl text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            No Bus Allocation Found
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            {errorMessage || 'Your registration has not yet been assigned to a bus route by the transportation administrator.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Bus Info Card */}
          <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-[#27272a]">
              <div>
                <span className="text-[11px] font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider">
                  OFFICIAL TRANSIT PASS
                </span>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">
                  Bus {data.bus.busNumber}
                </h2>
              </div>
              <Badge variant="emerald" className="text-xs px-3 py-1">
                Active Route
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>Assigned Transit Route</span>
                </div>
                <p className="text-base font-bold text-zinc-800 dark:text-zinc-200 pl-6">
                  {data.bus.routeName}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Daily Transit Windows</span>
                </div>
                <div className="pl-6 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <p>
                    <strong>Morning:</strong> Arrives college ground &bull; Ground geofence active
                  </p>
                  <p>
                    <strong>Evening:</strong> Departs college ground &bull; Boarding verification active
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned In-Charge Contact Card */}
          <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-[#27272a]">
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Assigned Bus In-Charge
              </h2>
            </div>

            {data.incharge ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-zinc-400 font-medium block">In-Charge Name</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-bold text-sm mt-0.5 block">
                    {data.incharge.name}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 font-medium block">Contact Email</span>
                  <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{data.incharge.email}</span>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 font-medium block">Contact Phone</span>
                  <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{data.incharge.phone || 'Available via transport desk'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">
                In-Charge assignment is currently pending administrative allocation.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
