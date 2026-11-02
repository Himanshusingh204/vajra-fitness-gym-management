import { usePageMeta } from '../../hooks/usePageMeta';
import RoleLoginForm from './RoleLoginForm';
import { ROUTES } from '../../utils/routes';

const PartnerLoginPage = () => {
  usePageMeta('Gym owner sign in', 'Sign in to manage your gym on Kavach Fitness.', ROUTES.partnerLogin);
  return (
    <RoleLoginForm
      role="owner"
      allowedRoles={['GYM_ADMIN']}
      audience="gym owner"
      title="Welcome back"
      subtitle="Log in to manage members, staff and billing."
      registerTo={ROUTES.partnerRegister}
      registerLabel="List your gym"
    />
  );
};

export default PartnerLoginPage;
