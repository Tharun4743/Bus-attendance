import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  MapPin,
  Save,
  RotateCcw,
  Compass,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

export const GeofenceSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields
  const [locationName, setLocationName] = useState<string>('College Ground');
  const [latitude, setLatitude] = useState<number>(13.0827);
  const [longitude, setLongitude] = useState<number>(80.2707);
  const [radiusMeters, setRadiusMeters] = useState<number>(10);
  const [maxAccuracyMeters, setMaxAccuracyMeters] = useState<number>(20);
  const [startTime, setStartTime] = useState<string>('16:50');
  const [endTime, setEndTime] = useState<string>('16:55');
  const [simulationEnabled, setSimulationEnabled] = useState<boolean>(false);
  const [simulatedTime, setSimulatedTime] = useState<string>('16:52');

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setLocationName(data.location.name);
      setLatitude(data.location.latitude);
      setLongitude(data.location.longitude);
      setRadiusMeters(data.location.radiusMeters);
      setMaxAccuracyMeters(data.location.maxGpsAccuracyMeters);
      setStartTime(data.startTime);
      setEndTime(data.endTime);
      setSimulationEnabled(!!data.simulation?.enabled);
      setSimulatedTime(data.simulation?.simulatedTime || '16:52');
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Math.round(pos.coords.latitude * 1000000) / 1000000);
        setLongitude(Math.round(pos.coords.longitude * 1000000) / 1000000);
        setMessage({
          type: 'success',
          text: `Captured your current browser coordinates (${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}). Remember to save!`,
        });
      },
      (err) => {
        setMessage({
          type: 'error',
          text: `Could not retrieve location: ${err.message}`,
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await api.updateSettings({
        startTime,
        endTime,
        location: {
          name: locationName.trim(),
          latitude: Number(latitude),
          longitude: Number(longitude),
          radiusMeters: Number(radiusMeters),
          maxGpsAccuracyMeters: Number(maxAccuracyMeters),
        },
        simulation: {
          enabled: simulationEnabled,
          simulatedTime: simulationEnabled ? simulatedTime : null,
        },
      });
      setMessage({ type: 'success', text: 'Geofence & attendance settings saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setLocationName('College Ground');
    setLatitude(13.0827);
    setLongitude(80.2707);
    setRadiusMeters(10);
    setMaxAccuracyMeters(20);
    setStartTime('16:50');
    setEndTime('16:55');
    setSimulationEnabled(false);
    setMessage({ type: 'success', text: 'Reset to standard default values. Remember to click Save.' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-2">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Loading geofence settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4 mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <Badge variant="blue" className="mb-2">
          GEOFENCE VERIFICATION
        </Badge>
        <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
          Geofence & Attendance Settings
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
          Configure authoritative College Ground coordinates, strict boundary radius, and timing window.
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-semibold transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-[#4ade80]'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-[#fb7185]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-[#4ade80]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-[#fb7185]" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Geofence Parameters Card */}
        <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-4 transition-all">
          <div className="flex items-center gap-2.5 border-b border-zinc-100 dark:border-[#26262e] pb-3">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#26262e]">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">College Ground Geofence</h2>
              <p className="text-[10px] text-zinc-400">Strict GPS verification boundary coordinates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Location Name
              </label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full h-10 px-3.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Ground Latitude (°N)
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full h-10 px-3.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Ground Longitude (°E)
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full h-10 px-3.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleUseCurrentLocation}
              >
                <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                <span>Set to My Device Current GPS</span>
              </Button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Geofence Radius (Meters)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                required
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                className="w-full h-10 px-3.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Standard: 10 meters</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Max Accepted GPS Accuracy (Meters)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                required
                value={maxAccuracyMeters}
                onChange={(e) => setMaxAccuracyMeters(parseInt(e.target.value, 10))}
                className="w-full h-10 px-3.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Standard: 20 meters</p>
            </div>
          </div>
        </div>

        {/* Attendance Window & Time Settings */}
        <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-4 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-[#26262e] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#26262e]">
                <Clock className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">Daily Attendance Window (Asia/Kolkata)</h2>
                <p className="text-[10px] text-zinc-400">Configure start and end window timings</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const ist = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
                  const [h, m] = ist.split(':').map(Number);
                  const endMins = (h * 60 + m + 5) % 1440;
                  const pad = (n: number) => String(n).padStart(2, '0');
                  setStartTime(ist);
                  setEndTime(`${pad(Math.floor(endMins / 60))}:${pad(endMins % 60)}`);
                  setMessage({ type: 'success', text: `Set start time to now (${ist}) and end time to +5m. Click Save Settings to apply.` });
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#4ade80] border border-emerald-200 dark:border-emerald-500/40 rounded-xl transition cursor-pointer active:scale-95"
              >
                Start Now (+5m)
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartTime('16:50');
                  setEndTime('16:55');
                  setMessage({ type: 'success', text: 'Set to standard 16:50 – 16:55 IST. Click Save Settings to apply.' });
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xl transition cursor-pointer active:scale-95"
              >
                Reset (16:50)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Session Start Time (IST)
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-10 px-3.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Standard: 16:50 (4:50 PM)</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Session End Time (IST)
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-10 px-3.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Standard: 16:55 (4:55 PM)</p>
            </div>
          </div>
        </div>

        {/* Simulation / Testing Mode */}
        <div className="bg-purple-50/50 dark:bg-[#1a1a20] rounded-2xl p-5 border border-purple-200/80 dark:border-[#26262e] space-y-3.5 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-[#c084fc] border border-purple-200 dark:border-purple-500/30">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-purple-950 dark:text-white">
                  Time Simulator (Testing)
                </h3>
                <p className="text-[10px] text-purple-700 dark:text-purple-300">
                  Allows testing attendance window at any real-world time.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={simulationEnabled}
                onChange={(e) => setSimulationEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {simulationEnabled && (
            <div className="pt-3 border-t border-purple-200/60 dark:border-[#26262e] flex items-center gap-3">
              <label className="text-xs font-bold text-purple-950 dark:text-white whitespace-nowrap">
                Simulated Time:
              </label>
              <input
                type="time"
                value={simulatedTime}
                onChange={(e) => setSimulatedTime(e.target.value)}
                className="h-9 px-3 text-xs rounded-xl border border-purple-200 dark:border-purple-500/30 bg-white dark:bg-[#141418] font-mono font-bold text-purple-950 dark:text-white outline-none"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={handleResetDefaults}
            variant="secondary"
            size="md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </Button>

          <Button
            type="submit"
            disabled={isSaving}
            variant="primary"
            size="md"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
