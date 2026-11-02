import { usePageMeta } from '../hooks/usePageMeta';
import RoleLoginForm from './auth/RoleLoginForm';
import { ROUTES } from '../utils/routes';

const LoginPage = () => {
  usePageMeta('Member sign in', 'Sign in to your Kavach Fitness member account.', ROUTES.login);
  return (
    <RoleLoginForm
      role="member"
      allowedRoles={['MEMBER', 'STAFF']}
      audience="member"
      title="Welcome back"
      subtitle="Log in to see your membership, check-ins and workouts."
      registerTo={ROUTES.memberRegister}
      registerLabel="Create a member account"
    />
  );
};

export default LoginPage;
