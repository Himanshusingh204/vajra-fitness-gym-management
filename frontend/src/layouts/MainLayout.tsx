import { Outlet } from 'react-router';
import PageTransition from '../components/PageTransition';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-control bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
    >
      Skip to content
    </a>
  );
}

const MainLayout = () => (
  <div className="flex min-h-dvh flex-col">
    <SkipLink />
    <SiteHeader />
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <PageTransition>
        <Outlet />
      </PageTransition>
    </main>
    <SiteFooter />
  </div>
);

export default MainLayout;
