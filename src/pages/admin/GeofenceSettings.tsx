import { GeofenceSettingsSkeleton } from '../../components/skeleton/AdminSkeletons';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  MapPin,
  Save,
  RotateCcw,
  Compass,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export const GeofenceSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields (Authoritative College Ground Geofence loaded dynamically from PostgreSQL)
  const [locationName, setLocationName] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [radiusMeters, setRadiusMeters] = useState<number>(10);
  const [maxAccuracyMeters, setMaxAccuracyMeters] = useState<number>(20);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setLocationName(data.location.name || 'College Ground');
      setLatitude(data.location.latitude);
      setLongitude(data.location.longitude);
      setRadiusMeters(data.location.radiusMeters || 10);
      setMaxAccuracyMeters(data.location.maxGpsAccuracyMeters || 20);
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
        location: {
          name: locationName.trim(),
          latitude: Number(latitude),
          longitude: Number(longitude),
          radiusMeters: Number(radiusMeters),
          maxGpsAccuracyMeters: Number(maxAccuracyMeters),
        },
      });
      setMessage({ type: 'success', text: 'Authoritative College Ground geofence settings saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsLoading(true);
    await fetchSettings();
    setMessage({ type: 'success', text: 'Reloaded current settings from live PostgreSQL database.' });
  };

  if (isLoading && !locationName) {
    return <GeofenceSettingsSkeleton />;
  }

  return (
    <div className="space-y-4 w-full mx-auto pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <Badge variant="blue" className="mb-2">
          GEOFENCE VERIFICATION
        </Badge>
        <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
          Ground Geofence Configuration
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
          Configure authoritative College Ground coordinates, strict boundary radius, and maximum accepted GPS accuracy.
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-[#4ade80]'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-[#fb7185]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ade80] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-[#fb7185] shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-[10px] font-bold uppercase text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Geofence Location Coordinates */}
        <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-4 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-[#26262e] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#26262e]">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
                  College Ground Geofence Centerpoint
                </h2>
                <p className="text-[10px] text-zinc-400">
                  Target physical point for student on-ground verification
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#1a1a20] hover:bg-zinc-100 dark:hover:bg-[#25252e] text-zinc-700 dark:text-zinc-300 text-xs font-bold transition active:scale-95 self-start sm:self-auto cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>Use Current Browser Location</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Location Name
              </label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. College Ground - Main Bay"
                className="w-full h-10 px-3.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Geofence Radius (Meters)
              </label>
              <input
                type="number"
                min="5"
                max="500"
                required
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                className="w-full h-10 px-3.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Default: 10 meters for strict College Ground boundary</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Latitude (WGS84 Decimal)
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full h-10 px-3.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Example: 10.957585</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Longitude (WGS84 Decimal)
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full h-10 px-3.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Example: 78.082725</p>
            </div>

            <div className="sm:col-span-2">
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
              <p className="text-[10px] text-zinc-400 mt-1">Standard: 20 meters. Submissions with worse GPS accuracy are rejected to prevent location spoofing.</p>
            </div>
          </div>
        </div>

        {/* Current Active Configuration Card */}
        <div className="bg-emerald-50/50 dark:bg-[#101a14] rounded-2xl p-5 border border-emerald-200/80 dark:border-emerald-500/20 space-y-2 transition-all">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-[#4ade80]">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-xs sm:text-sm font-bold">Active Geofence Parameters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px]">
            <div className="bg-white/80 dark:bg-[#141418] p-2.5 rounded-xl border border-emerald-200/60 dark:border-[#26262e]">
              <span className="text-zinc-400 block text-[10px] uppercase font-bold">Target Point</span>
              <span className="font-bold text-zinc-900 dark:text-white">{locationName || 'College Ground'}</span>
            </div>
            <div className="bg-white/80 dark:bg-[#141418] p-2.5 rounded-xl border border-emerald-200/60 dark:border-[#26262e]">
              <span className="text-zinc-400 block text-[10px] uppercase font-bold">Coordinates</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
            </div>
            <div className="bg-white/80 dark:bg-[#141418] p-2.5 rounded-xl border border-emerald-200/60 dark:border-[#26262e]">
              <span className="text-zinc-400 block text-[10px] uppercase font-bold">Strict Radius</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-[#4ade80]">{radiusMeters} meters</span>
            </div>
            <div className="bg-white/80 dark:bg-[#141418] p-2.5 rounded-xl border border-emerald-200/60 dark:border-[#26262e]">
              <span className="text-zinc-400 block text-[10px] uppercase font-bold">Max Accuracy</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{maxAccuracyMeters} meters</span>
            </div>
          </div>
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
            <span>{isSaving ? 'Saving...' : 'Save Ground Settings'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
