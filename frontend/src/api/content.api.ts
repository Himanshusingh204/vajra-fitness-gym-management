import api from '../services/api';

export interface PublicStats {
  gyms: number;
  members: number;
  trainers: number;
  cities: number;
}

// Real, live aggregate counts for marketing pages (home/about). No PII —
// safe to call without authentication.
export const getPublicStats = async () => {
  const response = await api.get<PublicStats>('/public/stats');
  return response.data;
};
