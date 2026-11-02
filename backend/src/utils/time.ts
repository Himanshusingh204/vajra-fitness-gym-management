// Gyms are in India, so "today" means the gym's calendar day, not the server's
// (Vercel runs in UTC, which would roll the day over at 5:30 am IST).
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

const DAY_MS = 24 * 60 * 60 * 1000;

// Midnight of the calendar day `d` falls on in `timeZone`, as a UTC instant.
export const startOfDayIn = (d: Date, timeZone = APP_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(d);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const [year, month, day] = [part('year'), part('month') - 1, part('day')];
  const wallClock = Date.UTC(year, month, day, part('hour'), part('minute'), part('second'));
  const offset = wallClock - Math.floor(d.getTime() / 1000) * 1000;
  return new Date(Date.UTC(year, month, day) - offset);
};

export const endOfDayIn = (d: Date, timeZone = APP_TIMEZONE) =>
  new Date(startOfDayIn(d, timeZone).getTime() + DAY_MS - 1);
