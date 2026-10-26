export const BOOKING_DAYS = 14; // kitne din aage tak booking
export const HOLD_MINUTES = 10; // online booking kitni der slot rokti hai

export const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const toTime = (n) =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

// "2026-11-02" + "10:15" ko IST ka asli time-instant banata hai
export const slotInstant = (date, time) => new Date(`${date}T${time}:00+05:30`);

// Aaj ki date India mein
export const istToday = () =>
  new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const isValidDate = (date) => {
  if (typeof date !== 'string' || !DATE_RX.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
};

// 0 = Sunday ... 6 = Saturday
export const dayOfWeek = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

// Booking window ke bahar ho to error message, warna null
export const checkWindow = (date) => {
  const today = istToday();
  if (date < today) return 'You cannot book a past date';
  if (date > addDays(today, BOOKING_DAYS))
    return `You can book only up to ${BOOKING_DAYS} days in advance`;
  return null;
};

// Availability se us din ke saare slots banata hai
export function generateSlots(availability, date, mode) {
  const day = dayOfWeek(date);
  const out = [];
  for (const s of availability.sessions) {
    if (s.day !== day) continue;
    const modes = s.mode === 'both' ? ['online', 'in-person'] : [s.mode];
    if (mode && !modes.includes(mode)) continue;
    for (
      let t = toMin(s.start);
      t + availability.slotMinutes <= toMin(s.end);
      t += availability.slotMinutes
    ) {
      out.push({ startTime: toTime(t), endTime: toTime(t + availability.slotMinutes), modes });
    }
  }
  const blocked = (availability.blocked || []).filter((b) => b.date === date);
  return out
    .filter(
      (s) => !blocked.some((b) => toMin(s.startTime) >= toMin(b.from) && toMin(s.startTime) < toMin(b.to))
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}