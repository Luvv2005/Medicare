const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

// Appointment time ke kitne minute baad no-show mark ho sakta hai
export const NOSHOW_GRACE_MINUTES = num(process.env.NOSHOW_GRACE_MINUTES, 15);

// Reschedule rules
export const RESCHEDULE_MIN_HOURS = 2;
export const MAX_RESCHEDULES = 2;

// Waiting list offer kitne minute valid
export const OFFER_MINUTES = 10;

// Itne patients aage reh jayein to "turn approaching" notification
export const APPROACH_AHEAD = 2;