/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface GpsPointWithTime {
  latitude: number;
  longitude: number;
  timestamp?: string | number | Date;
}

/**
 * Calculates velocity (speed in km/h) between two consecutive GPS pings.
 * v = (Delta d in meters / Delta t in seconds) * 3.6
 */
export function calculateVelocity(
  p1: GpsPointWithTime,
  p2: GpsPointWithTime
): number {
  if (!p1.timestamp || !p2.timestamp) return 0;
  const t1 = new Date(p1.timestamp).getTime();
  const t2 = new Date(p2.timestamp).getTime();
  const dtSeconds = Math.abs(t2 - t1) / 1000;
  if (dtSeconds <= 0) return 0;

  const distanceMeters = calculateDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
  const speedKmh = (distanceMeters / dtSeconds) * 3.6;
  return Math.round(speedKmh * 100) / 100;
}

/**
 * Checks if velocity between two GPS telemetry pings exceeds max speed threshold (default 120 km/h).
 * Used for anti-spoofing / mock location teleportation jump detection.
 */
export function isVelocitySpoofed(
  p1: GpsPointWithTime,
  p2: GpsPointWithTime,
  maxSpeedKmh: number = 120
): boolean {
  const speed = calculateVelocity(p1, p2);
  return speed > maxSpeedKmh;
}

/**
 * Calculates GPS jitter spread (max distance - min distance) relative to a reference target coordinate.
 */
export function calculateJitterSpread(
  readings: Array<{ latitude: number; longitude: number }>,
  targetLat: number,
  targetLon: number
): number {
  if (!readings || readings.length === 0) return 0;
  const distances = readings.map((r) => calculateDistance(r.latitude, r.longitude, targetLat, targetLon));
  const max = Math.max(...distances);
  const min = Math.min(...distances);
  return Math.round((max - min) * 100) / 100;
}

/**
 * Evaluates whether the GPS jitter spread exceeds acceptable threshold (default: 25 meters).
 */
export function isJitterExcessive(
  spread: number,
  maxSpreadThreshold: number = 25
): boolean {
  return spread > maxSpreadThreshold;
}

/**
 * Evaluates if current coordinates are within target geofence radius.
 */
export function isWithinGeofence(
  currentLat: number,
  currentLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number
): boolean {
  const dist = calculateDistance(currentLat, currentLon, targetLat, targetLon);
  return dist <= radiusMeters;
}

