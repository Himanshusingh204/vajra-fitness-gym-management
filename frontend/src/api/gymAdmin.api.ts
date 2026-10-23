import api from '../services/api';

export interface TrainerApplication {
  id: string;
  status: 'PENDING' | 'REJECTED' | 'ACTIVE';
  specialization: string | null;
  experienceYears: number | null;
  city: string | null;
  bio: string | null;
  joiningDate: string;
  gymId: string;
  user: { id: string; username: string; email: string; phone: string | null; createdAt: string };
}

export const getTrainerApplications = (gymId: string, status: 'PENDING' | 'REJECTED' = 'PENDING') =>
  api.get<TrainerApplication[]>(`/staff/gym/${gymId}/trainer-applications`, { params: { status } }).then((r) => r.data);

export const approveTrainerApplication = (id: string) =>
  api.put<TrainerApplication>(`/staff/trainer-applications/${id}/approve`).then((r) => r.data);

export const rejectTrainerApplication = (id: string, reason?: string) =>
  api.put<TrainerApplication>(`/staff/trainer-applications/${id}/reject`, reason ? { reason } : {}).then((r) => r.data);
