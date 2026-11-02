export const ROUTES = {
  login: '/login',
  adminLogin: '/admin/login',
  forgotPassword: '/forgot-password',
  register: '/register',
  memberRegister: '/register/member',
  partnerLogin: '/partner/login',
  partnerRegister: '/partner/register',
  trainerLogin: '/trainer/login',
  trainerRegister: '/trainer/register',
} as const;

export type LoginRole = 'SUPER_ADMIN' | 'GYM_ADMIN' | 'MEMBER' | 'TRAINER' | 'STAFF';

const HOME: Record<string, string> = {
  SUPER_ADMIN: '/admin',
  GYM_ADMIN: '/owner',
  MEMBER: '/dashboard',
  TRAINER: '/trainer',
  STAFF: '/staff',
};

export const dashboardFor = (role: string) => HOME[role] ?? '/';

export const loginPageFor = (role: string) =>
  role === 'SUPER_ADMIN'
    ? ROUTES.adminLogin
    : role === 'GYM_ADMIN'
      ? ROUTES.partnerLogin
      : role === 'TRAINER'
        ? ROUTES.trainerLogin
        : ROUTES.login;
