export const formatDuration = (days: number) => {
  if (days % 365 === 0) return `${days / 365} year${days / 365 > 1 ? 's' : ''}`;
  if (days % 30 === 0 && days > 0) return `${days / 30} month${days / 30 > 1 ? 's' : ''}`;
  return `${days} days`;
};

export const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

// YYYY-MM-DD in the viewer's local timezone. toISOString() converts to UTC
// first, which shifts the date for IST users between 12:00-5:29 AM — exactly
// when gyms are open — so plain date-key comparisons must use this instead.
export const localDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
