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
  Building2,
} from 'lucide-react';
import { Bus, SessionType } from '../../types';

interface InchargeMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bus: Bus;
  initialSessionType?: SessionType;
  onSessionStarted: () => void;
}

// Preset College & Transit Checkpoints
const PRESET_CHECKPOINTS = [
  {
    name: 'College Main Gate',
    lat: 10.9572,
    lon: 78.0766,
    desc: 'Main Highway Entrance Arch',
  },
  {
    name: 'Campus Bus Bay',
    lat: 10.9585,
    lon: 78.078,
    desc: 'Central Transit Parking Platform',
  },
  {
    name: 'Engineering Block Bay',
    lat: 10.956,
    lon: 78.0755,
    desc: 'Academic Block Pickup Point',
  },
  {
    name: 'Karur Central Stand',
    lat: 10.9602,
    lon: 78.082,
    desc: 'City Center Transit Junction',
  },
];

export const InchargeMapPickerModal: React.FC<InchargeMapPickerModalProps> = ({
  isOpen,
  onClose,
  bus,
  initialSessionType = 'MORNING',
  onSessionStarted,
}) => {
  const [sessionType, setSessionType] = useState<SessionType>(initialSessionType);
  const [locationName, setLocationName] = useState<string>('Campus Bus Bay');
  const [latitude, setLatitude] = useState<number>(10.9572);
  const [longitude, setLongitude] = useState<number>(78.0766);
  const [radiusMeters, setRadiusMeters] = useState<number>(100);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Initialize or re-render map when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Create custom vibrant Bus Marker icon
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

        const map = L.map(mapContainerRef.current, {
          center: [latitude, longitude],
          zoom: 16,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Marker
        const marker = L.marker([latitude, longitude], {
          icon: busIcon,
          draggable: true,
        }).addTo(map);

        marker.bindTooltip('📍 <b>Bus Location</b><br>Drag or click map to move', {
          permanent: false,
          direction: 'top',
        });

        // Geofence Circle
        const circle = L.circle([latitude, longitude], {
          color: '#f59e0b',
          fillColor: '#fbbf24',
          fillOpacity: 0.22,
          weight: 2,
          radius: radiusMeters,
        }).addTo(map);

        // Handle Marker Drag
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const lat = Math.round(pos.lat * 1000000) / 1000000;
          const lon = Math.round(pos.lng * 1000000) / 1000000;
          setLatitude(lat);
          setLongitude(lon);
          circle.setLatLng(pos);
        });

        // Handle Map Click (moves marker directly)
        map.on('click', (e: L.LeafletMouseEvent) => {
          const lat = Math.round(e.latlng.lat * 1000000) / 1000000;
          const lon = Math.round(e.latlng.lng * 1000000) / 1000000;
          setLatitude(lat);
          setLongitude(lon);
          marker.setLatLng(e.latlng);
          circle.setLatLng(e.latlng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        circleRef.current = circle;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([latitude, longitude], 16);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Clean up map when modal completely unmounts
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync radius changes to Leaflet circle
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusMeters);
    }
  }, [radiusMeters]);

  // Set position helper
  const updateMapPosition = (lat: number, lon: number, name?: string) => {
    setLatitude(lat);
    setLongitude(lon);
    if (name) setLocationName(name);

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      const latlng: L.LatLngExpression = [lat, lon];
      markerRef.current.setLatLng(latlng);
      circleRef.current.setLatLng(latlng);
      mapInstanceRef.current.setView(latlng, 16);
    }
  };

  // Device GPS capture
  const handleUseDeviceLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lon = Math.round(pos.coords.longitude * 1000000) / 1000000;
        updateMapPosition(lat, lon, 'Current Live GPS Location');
      },
      (err) => {
        setIsLocating(false);
        setErrorMsg(`Unable to retrieve GPS: ${err.message}. Please click manually on the map.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Submit and start attendance session
  const handleConfirmAndStart = async () => {
    if (!locationName.trim()) {
      setErrorMsg('Please specify a Location Name (e.g. Main Gate, Campus Bus Bay).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/attendance/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bus_token')}`,
        },
        body: JSON.stringify({
          sessionType,
          attendanceMode: 'TRAVELLING',
          verificationMethod: 'FACE_GPS',
          busId: bus.id,
          locationName: locationName.trim(),
          latitude,
          longitude,
          radiusMeters,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start session.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#141418] rounded-3xl border border-zinc-200 dark:border-[#26262e] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-zinc-200 dark:border-[#26262e] flex items-center justify-between bg-zinc-50/70 dark:bg-[#181820]/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-lg">
              🗺️
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                Set Bus Location on Map
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  {bus.busNumber}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Click on the map to pin the bus location and adjust student attendance geofence radius.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4.5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Map & Toolbar Container */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-[#26262e] shadow-inner">
            {/* Interactive Leaflet Canvas */}
            <div
              ref={mapContainerRef}
              className="w-full h-72 sm:h-80 z-0 bg-zinc-100 dark:bg-zinc-900"
            />

            {/* Floating Top Controls over Map */}
            <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="bg-white/95 dark:bg-[#181820]/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 shadow-sm pointer-events-auto flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleUseDeviceLocation}
                disabled={isLocating}
                className="bg-white/95 dark:bg-[#181820]/95 hover:bg-white dark:hover:bg-[#202028] backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-sm pointer-events-auto flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-60"
              >
                <Crosshair className={`w-3.5 h-3.5 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
              </button>
            </div>

            {/* Floating Bottom Instructions */}
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
              <span className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg text-[11px] font-semibold text-white shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Tap anywhere on map or drag pin to adjust
              </span>
            </div>
          </div>

          {/* Quick Checkpoint Presets */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">
              Quick Landmark Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_CHECKPOINTS.map((chk) => {
                const isMatch =
                  Math.abs(latitude - chk.lat) < 0.0001 && Math.abs(longitude - chk.lon) < 0.0001;
                return (
                  <button
                    key={chk.name}
                    type="button"
                    onClick={() => updateMapPosition(chk.lat, chk.lon, chk.name)}
                    className={`p-2.5 rounded-xl border text-left transition text-xs cursor-pointer ${
                      isMatch
                        ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                        : 'bg-zinc-50 dark:bg-[#181820] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate font-bold">{chk.name}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{chk.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Name & Geofence Boundary Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50/60 dark:bg-[#181820]/60 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            {/* Location Label */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Location Name / Checkpoint *
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Campus Bus Bay, Main Gate Stop"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#101014] text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <p className="text-[10px] text-zinc-400">
                Shown to commuters on their digital boarding pass receipt.
              </p>
            </div>

            {/* Geofence Radius */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Geofence Radius Ring
                </label>
                <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                  {radiusMeters}m
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {[20, 50, 100, 200, 500].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRadiusMeters(m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      radiusMeters === m
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                        : 'bg-white dark:bg-[#101014] border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400">
                Students within {radiusMeters} meters of the bus pin will be marked Present.
              </p>
            </div>
          </div>

          {/* Session Timing Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#181820] border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Shift Timing Schedule:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSessionType('MORNING')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  sessionType === 'MORNING'
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                    : 'bg-white dark:bg-[#101014] border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Morning Transit
              </button>
              <button
                type="button"
                onClick={() => setSessionType('EVENING')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  sessionType === 'EVENING'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'bg-white dark:bg-[#101014] border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Evening Return
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4.5 sm:p-6 border-t border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#181820]/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Bus: <strong className="text-zinc-900 dark:text-white font-mono">{bus.busNumber}</strong> ({bus.routeName})
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAndStart}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSubmitting ? 'Starting...' : 'Confirm Location & Start Session'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
