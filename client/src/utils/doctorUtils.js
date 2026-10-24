const COLORS = ['#3dbb8a', '#e08a2b', '#8e5bd6', '#d9534f', '#2b7fe0', '#1f9d9a'];

// "Dr. Simran Kaur" -> "SK"
export const initials = (name = '') =>
  name
    .replace(/^dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

// Same naam ko hamesha same rang
export const avatarColor = (name = '') => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};

export const hasCoords = (clinic) =>
  Array.isArray(clinic?.location?.coordinates) && clinic.location.coordinates.length === 2;

// user: { lat, lng }, coords: [lng, lat]
export function distanceKm(user, coords) {
  const toRad = (d) => (d * Math.PI) / 180;
  const [lng, lat] = coords;
  const dLat = toRad(lat - user.lat);
  const dLng = toRad(lng - user.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(user.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const destination = (clinic) =>
  hasCoords(clinic)
    ? `${clinic.location.coordinates[1]},${clinic.location.coordinates[0]}`
    : encodeURIComponent(
        `${clinic.name}, ${clinic.address}, ${clinic.city}, ${clinic.state} ${clinic.pincode}`
      );

export const mapsUrl = (clinic) =>
  `https://www.google.com/maps/search/?api=1&query=${destination(clinic)}`;

// travel: 'driving' | 'walking'
export const directionsUrl = (clinic, travel = 'driving') =>
  `https://www.google.com/maps/dir/?api=1&destination=${destination(clinic)}&travelmode=${travel}`;