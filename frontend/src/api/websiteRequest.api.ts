import api from '../services/api';

export interface WebsiteRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  desiredSlug: string;
  note?: string | null;
  createdAt: string;
  gym?: { id: string; name: string; city: string };
}

export const createWebsiteRequest = (data: { desiredSlug: string; note?: string }) =>
  api.post<WebsiteRequest>('/website-requests', data).then((r) => r.data);

export const getMyWebsiteRequests = () =>
  api.get<WebsiteRequest[]>('/website-requests/mine').then((r) => r.data);

export const getAllWebsiteRequests = () =>
  api.get<WebsiteRequest[]>('/website-requests').then((r) => r.data);

export const decideWebsiteRequest = (id: string, action: 'approve' | 'reject') =>
  api.put<WebsiteRequest>(`/website-requests/${id}/${action}`).then((r) => r.data);
