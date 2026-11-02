import api from '../services/api';

export type TrainerInvite = { id: string; email: string; name: string | null; expiresAt: string; createdAt: string };

export const getTrainerInvites = async (): Promise<TrainerInvite[]> => (await api.get('/trainers/invites')).data;

export const inviteTrainer = async (body: { email: string; name?: string }) => (await api.post('/trainers/invites', body)).data;

export const revokeTrainerInvite = async (id: string) => (await api.delete(`/trainers/invites/${id}`)).data;
