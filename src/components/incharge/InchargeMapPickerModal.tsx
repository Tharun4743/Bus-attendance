import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Crosshair,
  Sparkles,
  X,
  Play,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { Bus, SessionType } from '../../types';

interface InchargeMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bus: Bus;
  initialSessionType?: SessionType;
  initialAttendanceMode?: 'GROUND' | 'TRAVELLING';
  onSessionStarted: () => void;
}

export const InchargeMapPickerModal: React.FC<InchargeMapPickerModalProps> = ({
  isOpen,
  onClose,
  bus,
  initialSessionType = 'MORNING',
  initialAttendanceMode = 'GROUND',
  onSessionStarted,
}) => {
  const [sessionType, setSessionType] = useState<SessionType>(initialSessionType);
  const [attendanceMode, setAttendanceMode] = useState<'GROUND' | 'TRAVELLING'>(initialAttendanceMode);
  const [locationName, setLocationName] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'ACQUIRING' | 'LOCKED' | 'ERROR'>('ACQUIRING');
  const [radiusMeters, setRadiusMeters] = useState<number>(initialAttendanceMode === 'GROUND' ? 35 : 1000);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Helper to re-position map & marker
  const applyCoordinatesToMap = (lat: number, lon: number, radius: number, zoomLevel?: number) => {
    if (!mapInstanceRef.current) return;
    const latlng: L.LatLngExpression = [lat, lon];

    if (!markerRef.current) {
      const busIcon = L.divIcon({
        className: 'custom-bus-pin',
        html: `
          <div style="
            width: 38px;
            height: 38px;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 8px 16px rgba(217, 119, 6, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
            cursor: grab;
          ">
            🚌
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const marker = L.marker(latlng, {
        icon: busIcon,
        draggable: true,
      }).addTo(mapInstanceRef.current);

      marker.bindTooltip('📍 <b>Live Bus Location</b><br>Drag or click map to fine-tune', {
        permanent: false,
        direction: 'top',
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const newLat = Math.round(pos.lat * 1000000) / 1000000;
        const newLon = Math.round(pos.lng * 1000000) / 1000000;
        setLatitude(newLat);
        setLongitude(newLon);
        if (circleRef.current) circleRef.current.setLatLng(pos);
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(latlng);
    }

    if (!circleRef.current) {
      const circle = L.circle(latlng, {
        color: '#f59e0b',
        fillColor: '#fbbf24',
        fillOpacity: 0.22,
        weight: 2,
        radius,
      }).addTo(mapInstanceRef.current);
      circleRef.current = circle;
    } else {
      circleRef.current.setLatLng(latlng);
      circleRef.current.setRadius(radius);
    }

    mapInstanceRef.current.setView(latlng, zoomLevel || (radius <= 50 ? 17 : 14));
    mapInstanceRef.current.invalidateSize();
  };

  // High-Accuracy Live Device Geolocation Acquisition
  const acquireLiveGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('ERROR');
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGpsStatus('ACQUIRING');
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lon = Math.round(pos.coords.longitude * 1000000) / 1000000;
        const acc = Math.round(pos.coords.accuracy || 10);

        setLatitude(lat);
        setLongitude(lon);
        setGpsAccuracy(acc);
        setGpsStatus('LOCKED');

        if (!locationName) {
          setLocationName(
            attendanceMode === 'TRAVELLING'
              ? `${bus.busNumber} En Route Transit`
              : `${bus.busNumber} Bus Bay (${bus.routeName || 'Campus'})`
          );
        }

        applyCoordinatesToMap(lat, lon, radiusMeters, attendanceMode === 'GROUND' ? 17 : 14);
      },
      (err) => {
        setIsLocating(false);
        setGpsStatus('ERROR');
        let msg = 'Unable to acquire device GPS. ';
        if (err.code === 1) {
          msg += 'Location permission denied. Please allow GPS access in your browser settings.';
        } else if (err.code === 2) {
          msg += 'Position unavailable. Please ensure GPS is turned on.';
        } else {
          msg += 'Request timed out. Please tap your live position on the map.';
        }
        setErrorMsg(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Setup Leaflet map and trigger automatic live GPS on open
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    const initialMode = initialAttendanceMode || 'TRAVELLING';
    setAttendanceMode(initialMode);
    const r = initialMode === 'GROUND' ? 35 : 1000;
    setRadiusMeters(r);
    setLocationName(
      initialMode === 'TRAVELLING'
        ? `${bus.busNumber} En Route Transit`
        : `${bus.busNumber} Bus Bay (${bus.routeName || 'Campus'})`
    );

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Create Leaflet instance
        const map = L.map(mapContainerRef.current, {
          center: [10.9576, 78.0766], // Initial canvas center while GPS locks
          zoom: 14,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Click on map to place or move marker
        map.on('click', (e: L.LeafletMouseEvent) => {
          const lat = Math.round(e.latlng.lat * 1000000) / 1000000;
          const lon = Math.round(e.latlng.lng * 1000000) / 1000000;
          setLatitude(lat);
          setLongitude(lon);
          setGpsStatus('LOCKED');
          applyCoordinatesToMap(lat, lon, radiusMeters);
        });

        mapInstanceRef.current = map;
      }

      // Automatically acquire live GPS immediately on modal open
      acquireLiveGps();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Clean up Leaflet map when modal unmounts
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  // Sync radius changes to Leaflet circle
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusMeters);
    }
  }, [radiusMeters]);

  // Handle Mode Change (Stationary Bay vs. Travelling Transit)
  const handleSelectMode = (mode: 'GROUND' | 'TRAVELLING') => {
    setAttendanceMode(mode);
    const newRadius = mode === 'GROUND' ? 35 : 1000;
    setRadiusMeters(newRadius);

    setLocationName(
      mode === 'TRAVELLING'
        ? `${bus.busNumber} En Route Transit`
        : `${bus.busNumber} Bus Bay (${bus.routeName || 'Campus'})`
    );

    if (latitude !== null && longitude !== null) {
      applyCoordinatesToMap(latitude, longitude, newRadius, mode === 'GROUND' ? 17 : 14);
    }
  };

  // Submit and start attendance session
  const handleConfirmAndStart = async () => {
    if (latitude === null || longitude === null) {
      setErrorMsg('Live GPS location is required. Please wait for GPS to lock or tap your bus location on the map.');
      return;
    }

    if (!locationName.trim()) {
      setErrorMsg('Please specify a Location Name (e.g. Main Gate, Campus Bus Bay).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/attendance/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bus_token')}`,
        },
        body: JSON.stringify({
          sessionType,
          attendanceMode,
          verificationMethod: 'FACE_GPS',
          busId: bus.id,
          locationName: locationName.trim(),
          latitude,
          longitude,
          radiusMeters,
          maxGpsAccuracyMeters: attendanceMode === 'TRAVELLING' ? 1500 : 60,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start attendance session.');
      }

      onSessionStarted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start attendance session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#141418] rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-[#26262e] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-zinc-200 dark:border-[#26262e] flex items-center justify-between bg-zinc-50/80 dark:bg-[#181820]/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
              🛰️
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
                <span>Start Attendance Session</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  {bus.busNumber}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                Automatic live GPS geofence for passenger face & biometric audit.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* DUAL MODE SELECTOR: Stationary Bay vs Travelling Transit */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                Select Attendance Mode *
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                {attendanceMode === 'GROUND' ? 'Strict ~35m Bus Bay Perimeter' : 'Highway Motion ~1000m Perimeter'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Option 1: Stationary / Bus Bay Mode */}
              <button
                type="button"
                onClick={() => handleSelectMode('GROUND')}
                className={`p-3 rounded-xl border text-left transition flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 cursor-pointer ${
                  attendanceMode === 'GROUND'
                    ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'bg-white dark:bg-[#121216] border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className={`p-2 rounded-lg text-base shrink-0 ${attendanceMode === 'GROUND' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}>
                  🛑
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-zinc-900 dark:text-white">Stationary Bay</span>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase">
                      ~35m
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight line-clamp-1 sm:line-clamp-none">
                    Bus parked at campus bay or terminal.
                  </p>
                </div>
              </button>

              {/* Option 2: Travelling Transit Mode */}
              <button
                type="button"
                onClick={() => handleSelectMode('TRAVELLING')}
                className={`p-3 rounded-xl border text-left transition flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 cursor-pointer ${
                  attendanceMode === 'TRAVELLING'
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                    : 'bg-white dark:bg-[#121216] border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className={`p-2 rounded-lg text-base shrink-0 ${attendanceMode === 'TRAVELLING' ? 'bg-amber-500 text-white shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}>
                  🚌
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-zinc-900 dark:text-white">Travelling Transit</span>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase">
                      ~1000m
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight line-clamp-1 sm:line-clamp-none">
                    Bus is in motion along highway route.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Interactive Leaflet Map & GPS Lock Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-[#26262e] shadow-inner">
            {/* Live Map Canvas */}
            <div
              ref={mapContainerRef}
              className="w-full h-56 sm:h-72 z-0 bg-zinc-100 dark:bg-zinc-900"
            />

            {/* Acquiring Real Live GPS Satellite Fix Overlay */}
            {gpsStatus === 'ACQUIRING' && (
              <div className="absolute inset-0 z-20 bg-zinc-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="w-10 h-10 rounded-full border-3 border-amber-400 border-t-transparent animate-spin mb-3 shadow-lg shadow-amber-500/20" />
                <p className="text-xs font-black tracking-wide uppercase text-amber-300 flex items-center gap-2">
                  <Navigation className="w-4 h-4 animate-pulse" />
                  <span>Locking Live Physical Bus GPS Fix...</span>
                </p>
                <p className="text-[11px] text-zinc-300 mt-1 max-w-xs font-medium">
                  Auto-detecting exact device coordinates for Bus {bus.busNumber}. Zero mock coordinates.
                </p>
              </div>
            )}

            {/* Floating Top GPS Status Overlay */}
            <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="bg-white/95 dark:bg-[#181820]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 shadow-sm pointer-events-auto flex items-center gap-2">
                {gpsStatus === 'LOCKED' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>
                      {latitude?.toFixed(5)}, {longitude?.toFixed(5)} (±{gpsAccuracy}m)
                    </span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                    <span className="text-amber-600 dark:text-amber-400">Acquiring live GPS...</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={acquireLiveGps}
                disabled={isLocating}
                className="bg-white/95 dark:bg-[#181820]/95 hover:bg-white dark:hover:bg-[#202028] backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-sm pointer-events-auto flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-60"
              >
                <Crosshair className={`w-3.5 h-3.5 text-amber-500 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : 'Refresh Live GPS'}</span>
              </button>
            </div>

            {/* Floating Hint */}
            <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
              <span className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Auto-locked to device GPS. Tap map to adjust if needed.
              </span>
            </div>
          </div>

          {/* Location Name & Geofence Radius Slider / Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50/70 dark:bg-[#181820]/70 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            {/* Location Label */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Location Label / Checkpoint *
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Campus Bus Bay, Highway Stop"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#101014] text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* Radius Presets */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Geofence Radius Ring
                </label>
                <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                  {radiusMeters}m
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {(attendanceMode === 'GROUND'
                  ? [15, 25, 35, 50]
                  : [500, 800, 1000, 1500]
                ).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setRadiusMeters(m);
                      if (circleRef.current) circleRef.current.setRadius(m);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      radiusMeters === m
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-[#101014] border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shift Timing Selector */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-[#181820] border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Shift Timing:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSessionType('MORNING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  sessionType === 'MORNING'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white dark:bg-[#101014] border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Morning
              </button>
              <button
                type="button"
                onClick={() => setSessionType('EVENING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  sessionType === 'EVENING'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#101014] border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Evening
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-5 border-t border-zinc-200 dark:border-[#26262e] bg-zinc-50/80 dark:bg-[#181820]/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span>Bus: <strong className="text-zinc-900 dark:text-white font-mono">{bus.busNumber}</strong> ({bus.routeName})</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAndStart}
              disabled={isSubmitting || latitude === null}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSubmitting ? 'Starting Session...' : 'Start Session with Live GPS'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
