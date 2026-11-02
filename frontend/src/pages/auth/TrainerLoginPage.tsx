import { usePageMeta } from '../../hooks/usePageMeta';
import RoleLoginForm from './RoleLoginForm';
import { ROUTES } from '../../utils/routes';

const TrainerLoginPage = () => {
  usePageMeta('Trainer sign in', 'Sign in to your Kavach Fitness trainer account.', ROUTES.trainerLogin);
  return (
    <RoleLoginForm
      role="trainer"
      allowedRoles={['TRAINER']}
      audience="trainer"
      title="Welcome back, coach"
      subtitle="Log in to see your clients, schedule and plans."
      registerTo={ROUTES.trainerRegister}
      registerLabel="Apply as a trainer"
    />
  );
};

export default TrainerLoginPage;
