// Shapes as the API returns them. Prisma Decimal fields arrive as strings.

export type Role = 'SUPER_ADMIN' | 'GYM_ADMIN' | 'TRAINER' | 'STAFF' | 'MEMBER';
export type TrainerStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';
export type Money = string | number;

export type SessionUser = { id: string; username: string; email: string; role: Role };

export type AuthResponse = { user: SessionUser; token: string; refreshToken: string; message?: string };

export type GymRef = { id: string; name: string };

export type MembershipPlan = {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: Money;
};

export type Membership = {
  id: string;
  startDate: string;
  endDate: string;
  finalAmount: Money;
  paymentStatus: string;
  status: string;
  lifecycleStatus?: string;
  plan?: { id: string; name: string; duration: number; price: Money } | null;
};

export type Me = {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  trainerStatus?: TrainerStatus | null;
  memberDetails: {
    id: string;
    status: string;
    gym: GymRef & { city?: string };
    membershipPlan: MembershipPlan | null;
  } | null;
  trainerDetails: { id: string; status?: TrainerStatus; specialization?: string | null; gym: GymRef } | null;
  staffDetails: { id: string; role: string; gym: GymRef } | null;
  ownedGyms: (GymRef & { isApproved: boolean })[];
};

export type PublicGym = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  membershipPlans?: MembershipPlan[];
};

export type MemberProfile = {
  id: string;
  status: string;
  gymId: string;
  joiningDate: string;
  gym: { id: string; name: string; city: string };
  membershipPlan: MembershipPlan | null;
};

export type Fee = {
  id: string;
  amount: Money;
  paymentDate: string;
  dueDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL' | string;
  paymentMethod?: string | null;
  notes?: string | null;
  memberId: string;
  member?: { id: string; user: { username: string; email?: string } };
};

export type AttendanceRecord = {
  id: string;
  checkIn: string;
  checkOut: string | null;
  status: string;
  memberId: string | null;
  gym?: { name: string };
  member?: { user: { username: string } } | null;
  staff?: { user: { username: string } } | null;
};

export type MyAttendance = { memberId: string; total: number; records: AttendanceRecord[] };

export type GymAttendance = { records: AttendanceRecord[]; total: number; page: number; pageSize: number };

export type WorkoutSlip = {
  id: string;
  title: string | null;
  exercises: string;
  assignedDate: string;
  validUntil: string | null;
  memberId: string;
  trainer?: { user: { username: string } } | null;
  member?: { user: { username: string } };
};

export type GymMember = {
  id: string;
  status: string;
  joiningDate: string;
  user: { id: string; username: string; email?: string; phone?: string | null };
  membershipPlan: MembershipPlan | null;
};

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type Booking = {
  id: string;
  date: string;
  time: string;
  status: BookingStatus;
  notes: string | null;
  user: { username: string; email: string; phone: string | null };
  gym: { name: string };
};

export type Enquiry = {
  id: string;
  name: string;
  phone: string;
  status: string;
  date: string;
  notes: string | null;
};

export type GymStats = {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  pendingFees: number;
  attendanceToday: number;
  revenueThisMonth: Money;
};
