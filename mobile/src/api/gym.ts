import { api } from './session';
import type {
  AttendanceRecord,
  Booking,
  BookingStatus,
  Enquiry,
  Fee,
  GymAttendance,
  GymMember,
  GymStats,
  Membership,
  MemberProfile,
  MyAttendance,
  PublicGym,
  WorkoutSlip,
} from './types';

export const listGyms = () => api.get<PublicGym[]>('/gym');

// Member self-service
export const getMyProfile = () => api.get<MemberProfile>('/members/my-profile');
export const getMyMemberships = () => api.get<Membership[]>('/memberships/my');
export const getMyAttendance = () => api.get<MyAttendance>('/attendance/my');
export const getMemberFees = (memberId: string) => api.get<Fee[]>(`/fees/member/${memberId}`);
export const joinGym = (gymId: string) => api.post<{ message: string }>('/members/enroll', { gymId });
export const getMemberWorkouts = (memberId: string) => api.get<WorkoutSlip[]>(`/workouts/member/${memberId}`);

// Gym side (partner, staff, trainer as the backend allows)
export const getGymMembers = (gymId: string) => api.get<GymMember[]>(`/members/gym/${gymId}`);
export const getMember = (id: string) => api.get<GymMember & { gym: { name: string } }>(`/members/${id}`);
export const getGymStats = (gymId: string) => api.get<GymStats>(`/gym/${gymId}/stats`);
export const getGymFees = (gymId: string) => api.get<Fee[]>(`/fees/gym/${gymId}`);
export const getEnquiries = (gymId: string) => api.get<Enquiry[]>(`/enquiries/gym/${gymId}`);
export const getGymAttendance = (gymId: string, date: string) =>
  api.get<GymAttendance>(`/attendance/gym/${gymId}`, { date, limit: 100 });
export const markAttendance = (gymId: string, memberId: string) =>
  api.post<AttendanceRecord>(`/attendance/gym/${gymId}`, { memberId });

// Trainer
export const getTrainerBookings = () => api.get<Booking[]>('/bookings/trainer/my');
export const updateBooking = (id: string, status: BookingStatus) => api.patch<Booking>(`/bookings/${id}`, { status });
export const getGymWorkouts = (gymId: string) => api.get<WorkoutSlip[]>(`/workouts/gym/${gymId}`);
export const createWorkout = (memberId: string, body: { title?: string; exercises: string; validUntil?: string }) =>
  api.post<WorkoutSlip>(`/workouts/member/${memberId}`, body);
