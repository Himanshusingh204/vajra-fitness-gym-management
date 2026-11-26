import api from '../services/api';

export type ApplicationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface ApplicationGym {
  id: string;
  name: string;
  status: ApplicationStatus;
  category: string | null;
  description: string | null;
  establishedYear: number | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  facilities: string[];
  openingHours: string | null;
  parking: string | null;
  accessibility: string | null;
  rules: string | null;
  imageUrl: string | null;
  galleryUrls: string[];
}

export interface ApplicationPlan {
  id?: string;
  name: string;
  duration: number;
  price: number;
  description?: string | null;
}

export type ProofKind = 'ID_PROOF' | 'BUSINESS_PROOF' | 'GST_CERT';

export interface ApplicationDocument {
  id: string;
  kind: ProofKind;
  mime: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Application {
  gym: ApplicationGym;
  plans: ApplicationPlan[];
  documents: ApplicationDocument[];
  request: {
    id: string;
    ref: string;
    status: string;
    reviewNote: string | null;
    submittedAt: string | null;
    decidedAt: string | null;
  } | null;
}

export type ApplicationDraft = Partial<Omit<ApplicationGym, 'id' | 'status'>> & { plans?: ApplicationPlan[] };

export const getApplication = async () => (await api.get<Application>('/onboarding/gym')).data;

export const saveApplication = async (draft: ApplicationDraft) => (await api.patch<Application>('/onboarding/gym', draft)).data;

export const submitApplication = async () => (await api.post<Application>('/onboarding/gym/submit')).data;

export const uploadProof = async (gymId: string, kind: ProofKind, file: File) => {
  await api.post('/uploads', file, { params: { kind, gymId }, headers: { 'Content-Type': file.type } });
};

// Removes an uploaded proof or gallery photo by its document id.
export const removeUpload = async (id: string) => {
  await api.delete(`/onboarding/documents/${id}`);
};

export const getFacilities = async () => (await api.get<{ name: string; icon: string | null }[]>('/public/facilities')).data;

// Signed links last five minutes, so fetch one only when the file is opened.
// The tab opens before the request so popup blockers allow it.
export const openDocument = async (id: string) => {
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  try {
    const { url } = (await api.get<{ url: string }>(`/uploads/${id}/link`)).data;
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (err) {
    tab?.close();
    throw err;
  }
};
