import api from '../services/api';

interface GymPlan {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  isActive: boolean;
}

export interface Gym {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  location?: string | null;
  gstNumber?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  facilities?: string[] | null;
  tagline?: string | null;
  brandColor?: string | null;
  description?: string | null;
  openingHours?: string | null;
  phone?: string | null;
  email?: string | null;
  galleryUrls?: string[];
  isApproved: boolean;
  membershipPlans: GymPlan[];
  distanceKm?: number | null;
}

export const getPublicGyms = async (): Promise<Gym[]> => {
  const response = await api.get('/gym');
  return response.data;
};

export type GymSearch = Partial<Record<'q' | 'city' | 'facility' | 'minPrice' | 'maxPrice' | 'lat' | 'lng' | 'sort' | 'page' | 'limit', string | number>>;

export const searchGyms = async (params: GymSearch) => {
  const response = await api.get<{ items: Gym[]; total: number; page: number }>('/gym', { params: { ...params, paged: 1 } });
  return response.data;
};

export const getGymCities = async () => {
  const response = await api.get<string[]>('/gym/cities');
  return response.data;
};

export const enrollMember = async (gymId: string, planId?: string, preferredPaymentMethod?: string) => {
  const response = await api.post('/members/enroll', {
    gymId,
    planId,
    ...(preferredPaymentMethod ? { preferredPaymentMethod } : {}),
  });
  return response.data;
};

export interface PublicGym {
  id: string;
  name: string;
  tagline: string | null;
  address: string;
  city: string;
  state: string;
  location: string | null;
  facilities: string[] | null;
  brandColor: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  galleryUrls?: string[];
  openingHours?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  plans: { id: string; name: string; description: string | null; price: number; duration: number }[];
  trainers: { name: string; specialization: string | null; experienceYears: number | null }[];
  branches: { id: string; name: string; address: string; city: string; phone: string | null }[];
  classes: {
    id: string;
    name: string;
    dayOfWeek: string | null;
    startTime: string | null;
    endTime: string | null;
    duration: number;
    location: string | null;
  }[];
}

export const getPublicGym = async (id: string) => {
  const response = await api.get<PublicGym>(`/public/gyms/${encodeURIComponent(id)}`);
  return response.data;
};

export const getPublicSite = async (slug: string) => {
  const response = await api.get<PublicGym>(`/public/sites/${encodeURIComponent(slug)}`);
  return response.data;
};

export const sendGymEnquiry = async (gymId: string, data: { name: string; phone: string; email?: string; notes?: string }) => {
  const response = await api.post(`/enquiries/gym/${gymId}`, data);
  return response.data;
};

// The signed-in owner's own gym (GET/PUT /gym/my-branch).
export type MyGym = Omit<Gym, 'membershipPlans'> & { subdomain?: string | null };

export type GymProfileInput = Partial<Omit<MyGym, 'id' | 'isApproved' | 'gstNumber' | 'subdomain'>>;

export const getMyGym = async () => {
  const response = await api.get<MyGym>('/gym/my-branch');
  return response.data;
};

export const updateMyGym = async (data: GymProfileInput) => {
  const response = await api.put<MyGym & { changeRequest?: ChangeRequest | null }>('/gym/my-branch', data);
  return response.data;
};

export interface ChangeRequest {
  id: string;
  ref: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  currentValue: Record<string, string | null> | null;
  proposedValue: Record<string, string | null> | null;
  reviewNote?: string | null;
  submittedAt?: string | null;
  decidedAt?: string | null;
  gym?: { name: string; city: string } | null;
  requester?: { username: string; email: string };
}

export const getMyChangeRequests = async () => {
  const response = await api.get<ChangeRequest[]>('/gym/my-branch/change-requests');
  return response.data;
};

// Uploads one gallery photo and returns the public URL to store on the gym.
export const uploadGymPhoto = async (gymId: string, file: File) => {
  const response = await api.post<{ id: string }>('/uploads', file, {
    params: { kind: 'GALLERY', gymId },
    headers: { 'Content-Type': file.type },
  });
  return `/api/images/${response.data.id}`;
};
