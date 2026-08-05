export const formatDuration = (days: number) => {
  if (days % 365 === 0) return `${days / 365} year${days / 365 > 1 ? 's' : ''}`;
  if (days % 30 === 0 && days > 0) return `${days / 30} month${days / 30 > 1 ? 's' : ''}`;
  return `${days} days`;
};

export const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;
