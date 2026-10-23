export const splitFacilities = (facilities?: string | null) =>
  (facilities || '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
