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

// year * 12 + month (0-based) of the calendar month `d` falls in, in `timeZone`.
export const monthIndexIn = (d: Date, timeZone = APP_TIMEZONE) => {
  const [year, month] = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' })
    .format(d)
    .split('-')
    .map(Number);
  return year! * 12 + month! - 1;
};

// Midnight of the 1st of the month `monthsBack` months before `d`'s month, in `timeZone`.
export const startOfMonthIn = (d: Date, monthsBack = 0, timeZone = APP_TIMEZONE) => {
  const index = monthIndexIn(d, timeZone) - monthsBack;
  // Noon UTC on the 1st is still the 1st in any zone within 11 hours of UTC.
  return startOfDayIn(new Date(Date.UTC(Math.floor(index / 12), index % 12, 1, 12)), timeZone);
};

export const endOfMonthIn = (d: Date, monthsBack = 0, timeZone = APP_TIMEZONE) =>
  new Date(startOfMonthIn(d, monthsBack - 1, timeZone).getTime() - 1);
