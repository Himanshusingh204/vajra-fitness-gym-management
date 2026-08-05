import api from '../services/api';

// Gets the current logged in member's profile
export const getMyProfile = async () => {
  const response = await api.get('/members/my-profile');
  return response.data;
};

// Gets workout slips assigned to the member
export const getMyWorkouts = async (memberId: string) => {
  const response = await api.get(`/workouts/member/${memberId}`);
  return response.data;
};

// Gets the fees/payments for the member
export const getMyFees = async (memberId: string) => {
  const response = await api.get(`/fees/member/${memberId}`);
  return response.data;
};

// Gets all members of a gym (Gym Admin / Super Admin / Trainer at that gym)
export const getGymMembers = async (gymId: string) => {
  const response = await api.get(`/members/gym/${gymId}`);
  return response.data;
};
