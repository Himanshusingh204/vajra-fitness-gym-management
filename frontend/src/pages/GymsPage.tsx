import { GymDirectory } from '../components/GymDirectory';
import { Button, PageHeader } from '../components/ui';
import { pageSeo, useRouteMeta } from '../hooks/usePageMeta';

export default function GymsPage() {
  useRouteMeta('/gyms');
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <PageHeader
        title={pageSeo['/gyms'].h1}
        description="Every gym here has been approved by the platform. Open one to see its plans, trainers and facilities."
        actions={<Button to="/membership" variant="secondary">How membership works</Button>}
      />
      <div className="mt-8">
        <GymDirectory />
      </div>
    </div>
  );
}
