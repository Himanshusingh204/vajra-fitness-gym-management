import api from '../services/api';

export interface WorkoutSlip {
  id: string;
  title?: string | null;
  exercises: string;
  assignedDate: string;
  validUntil?: string | null;
  member?: { id: string; user: { username: string } };
  trainer?: { user: { username: string } } | null;
}

export const getGymWorkoutSlips = async (gymId: string) => {
  const response = await api.get<WorkoutSlip[]>(`/workouts/gym/${gymId}`);
  return response.data;
};

export const createWorkoutSlip = async (memberId: string, data: { title?: string; exercises: string; validUntil?: string }) => {
  const response = await api.post(`/workouts/member/${memberId}`, data);
  return response.data;
};
