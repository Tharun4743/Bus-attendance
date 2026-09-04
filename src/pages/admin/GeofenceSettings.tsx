import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-slate-500">Loading geofence settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Geofence & Attendance Settings
        </h1>
        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
          Configure authoritative College Ground coordinates, strict boundary radius, and timing window.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Geofence Parameters Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EAE2D2] space-y-3.5">
          <div className="flex items-center gap-2 border-b border-[#EAE2D2]/60 pb-2.5">
            <MapPin className="w-4 h-4 text-brand-600" />
            <div>
              <h2 className="text-xs font-bold text-slate-800">College Ground Geofence</h2>
              <p className="text-[10px] text-slate-400">Strict GPS verification boundary coordinates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Location Name
              </label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-semibold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ground Latitude (°N)
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ground Longitude (°E)
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F0] hover:bg-[#F4EFE4] text-slate-700 text-xs font-bold transition border border-[#EAE2D2]"
              >
                <Compass className="w-3.5 h-3.5 text-brand-600" />
                <span>Set to My Device Current GPS</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Geofence Radius (Meters)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                required
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Default: 10 meters</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Max Accepted GPS Accuracy (Meters)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                required
                value={maxAccuracyMeters}
                onChange={(e) => setMaxAccuracyMeters(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Default: 20 meters</p>
            </div>
          </div>
        </div>

        {/* Attendance Window & Time Settings */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EAE2D2] space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#EAE2D2]/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <div>
                <h2 className="text-xs font-bold text-slate-800">Daily Attendance Window (Asia/Kolkata)</h2>
                <p className="text-[10px] text-slate-400">Configure start and end window timings</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
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
                className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
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
                className="px-2 py-0.5 text-[10px] font-bold bg-[#FAF7F0] text-slate-700 border border-[#EAE2D2] rounded-lg hover:bg-[#F4EFE4] transition"
              >
                Reset (16:50)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Session Start Time (IST)
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Standard: 16:50 (4:50 PM)</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Session End Time (IST)
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Standard: 16:55 (4:55 PM)</p>
            </div>
          </div>
        </div>

        {/* Simulation / Testing Mode */}
        <div className="bg-[#FAF7F0] rounded-2xl p-4 border border-[#EAE2D2] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-700" />
              <div>
                <h3 className="text-xs font-bold text-purple-900">
                  Time Simulator (Testing)
                </h3>
                <p className="text-[10px] text-purple-700">
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
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {simulationEnabled && (
            <div className="pt-2.5 border-t border-purple-200/60 flex items-center gap-2.5">
              <label className="text-[11px] font-bold text-purple-900 whitespace-nowrap">
                Simulated Time:
              </label>
              <input
                type="time"
                value={simulatedTime}
                onChange={(e) => setSimulatedTime(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-xl border border-purple-200 bg-white font-mono font-bold text-purple-900 outline-none"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EAE2D2] bg-white text-slate-700 font-semibold text-xs hover:bg-[#FAF7F0] transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition shadow-sm disabled:opacity-70"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
