import { useEffect } from 'react';
import RoleLoginForm from './RoleLoginForm';

const AdminLoginPage = () => {
  useEffect(() => {
    document.title = 'Admin sign in | Kavach Fitness';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  return (
    <RoleLoginForm
      role="admin"
      allowedRoles={['SUPER_ADMIN']}
      audience="platform administrator"
      title="Admin sign in"
      subtitle="Platform administrators only."
    />
  );
};

export default AdminLoginPage;
