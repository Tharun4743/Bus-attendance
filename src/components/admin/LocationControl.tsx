import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CampusCheckpoint } from '../../types';
import { formatISTDate } from '../../utils/time';
import {
  MapPin,
  Compass,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  Crosshair,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';

interface LocationControlProps {
  onUpdated?: () => void;
}

export const LocationControl: React.FC<LocationControlProps> = ({ onUpdated }) => {
  const [locationName, setLocationName] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [radiusMeters, setRadiusMeters] = useState<number>(15);
  const [maxAccuracyMeters, setMaxAccuracyMeters] = useState<number>(20);

  const [checkpoints, setCheckpoints] = useState<CampusCheckpoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAddingCp, setIsAddingCp] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    try {
      const [settingsData, checkpointsData] = await Promise.all([
        api.getSettings(),
        api.getCheckpoints().catch(() => []),
      ]);
      setLocationName(settingsData.location.name);
      setLatitude(settingsData.location.latitude);
      setLongitude(settingsData.location.longitude);
      setRadiusMeters(settingsData.location.radiusMeters);
      setMaxAccuracyMeters(settingsData.location.maxGpsAccuracyMeters);
      setCheckpoints(checkpointsData);
    } catch (err) {
      console.error('Failed to load location settings or checkpoints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'Geolocation is not supported by your browser.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lon = Math.round(pos.coords.longitude * 1000000) / 1000000;
        setLatitude(lat);
        setLongitude(lon);
        setFeedback({
          type: 'success',
          message: `Captured live device coordinates (${lat.toFixed(6)}, ${lon.toFixed(6)}). Remember to save!`,
        });
      },
      (err) => {
        setFeedback({
          type: 'error',
          message: `Could not retrieve location: ${err.message}`,
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleApplyCheckpoint = (cp: CampusCheckpoint) => {
    setLocationName(cp.name);
    setLatitude(cp.latitude);
    setLongitude(cp.longitude);
    setRadiusMeters(cp.radiusMeters);
    setFeedback({
      type: 'success',
      message: `Selected database checkpoint "${cp.name}". Click "Save Target Location" to apply as active geofence.`,
    });
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim() || isNaN(latitude) || isNaN(longitude)) {
      setFeedback({ type: 'error', message: 'Valid location name, latitude, and longitude are required.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

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
      setFeedback({
        type: 'success',
        message: `Target location updated to "${locationName.trim()}" with a ${radiusMeters}-meter surrounding area boundary in PostgreSQL!`,
      });
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save location settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsNewCheckpoint = async () => {
    if (!locationName.trim() || isNaN(latitude) || isNaN(longitude)) {
      setFeedback({ type: 'error', message: 'Please provide a valid location name and coordinates first.' });
      return;
    }
    setIsAddingCp(true);
    try {
      const created = await api.createCheckpoint({
        name: locationName.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusMeters: Number(radiusMeters),
        description: `Custom checkpoint saved on ${formatISTDate(new Date())}`,
      });
      setCheckpoints((prev) => [...prev, created]);
      setFeedback({
        type: 'success',
        message: `Checkpoint "${created.name}" saved permanently to PostgreSQL!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save new checkpoint to database.',
      });
    } finally {
      setIsAddingCp(false);
    }
  };

  const handleDeleteCheckpoint = async (id: string, name: string) => {
    if (!confirm(`Delete checkpoint "${name}" from PostgreSQL database?`)) return;
    try {
      await api.deleteCheckpoint(id);
      setCheckpoints((prev) => prev.filter((c) => c.id !== id));
      setFeedback({
        type: 'success',
        message: `Checkpoint "${name}" removed from database.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete checkpoint.',
      });
    }
  };

  const surroundingMeterChips = [5, 10, 15, 20, 25, 30, 50, 100];
  const accuracyMeterChips = [10, 15, 20, 30, 50];

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Live Target Geofence & Checkpoints...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Target Attendance Location & Checkpoints (Live PostgreSQL)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Coordinates and perimeter radius are retrieved and persisted live from the database.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition self-start sm:self-auto shadow-sm cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-brand-600" />
          <span>Capture Device GPS</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 1. Live Database Checkpoints */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            1. Live Database Checkpoints ({checkpoints.length})
          </label>
          <span className="text-[10px] text-slate-400 font-medium">Loaded from PostgreSQL</span>
        </div>

        {checkpoints.length === 0 ? (
          <div className="p-4 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
            No checkpoints saved in database. Capture coordinates below to save the first checkpoint.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {checkpoints.map((p) => {
              const isSelected = locationName === p.name;
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleApplyCheckpoint(p)}
                    className="text-left w-full cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-extrabold text-slate-900 truncate">{p.name}</span>
                      </div>
                      {isSelected && <span className="h-2 w-2 rounded-full bg-brand-600 shrink-0" />}
                    </div>
                    {p.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{p.description}</p>
                    )}
                  </button>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-600">
                    <span>{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-brand-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {p.radiusMeters}m
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCheckpoint(p.id, p.name);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5 transition cursor-pointer"
                        title="Delete checkpoint"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Choose Surrounding Area in Meters */}
      <div className="bg-slate-50/70 rounded-3xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              2. Surrounding Area Boundary (Meters)
            </label>
            <p className="text-xs text-slate-500">
              Students within this radius from the target will be verified as <strong className="text-emerald-700 font-bold">PRESENT</strong>.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-2xl font-black text-brand-700 font-mono">{radiusMeters}</span>
            <span className="text-xs font-bold text-slate-500 uppercase">Meters</span>
          </div>
        </div>

        {/* Quick Surrounding Area Meter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {surroundingMeterChips.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setRadiusMeters(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                radiusMeters === m
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>

        {/* Surrounding Area Slider */}
        <div className="space-y-1 pt-1">
          <input
            type="range"
            min="3"
            max="150"
            step="1"
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono font-medium">
            <span>3m (Strict)</span>
            <span>15m (Gate/Bay)</span>
            <span>50m</span>
            <span>150m (Campus Wide)</span>
          </div>
        </div>

        {/* Live Visual Boundary Radar Graphic */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-300">
              <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-400 opacity-40"></span>
              <Crosshair className="w-6 h-6 text-brand-700 relative z-10" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">
                Target Zone: {locationName || 'Live Target'}
              </p>
              <p className="text-[11px] text-slate-500">
                Coordinates: <span className="font-mono font-bold text-slate-700">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                Tolerance: ±{radiusMeters} meters boundary ring
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              <Sparkles className="w-3 h-3" /> Live Geofence Boundary
            </span>
          </div>
        </div>
      </div>

      {/* 3. Manual Coordinate & Accuracy Inputs */}
      <form onSubmit={handleSaveLocation} className="space-y-4 pt-1">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          3. Custom Coordinates & Precision Controls
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Location Name Label *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Campus Bus Bay, Ground"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Latitude (°N) *
            </label>
            <input
              type="number"
              step="0.000001"
              required
              value={latitude || ''}
              onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Longitude (°E) *
            </label>
            <input
              type="number"
              step="0.000001"
              required
              value={longitude || ''}
              onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Max Accepted GPS Accuracy (Meters) *
              </label>
              <div className="flex items-center gap-1">
                {accuracyMeterChips.map((acc) => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => setMaxAccuracyMeters(acc)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                      maxAccuracyMeters === acc
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {acc}m
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min="1"
              max="500"
              required
              value={maxAccuracyMeters}
              onChange={(e) => setMaxAccuracyMeters(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">Rejects poor satellite signals exceeding {maxAccuracyMeters} meters</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSaveAsNewCheckpoint}
            disabled={isAddingCp}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save as New DB Checkpoint</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition shadow-md disabled:opacity-70 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving to Database...' : 'Save Target Location & Boundary'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
