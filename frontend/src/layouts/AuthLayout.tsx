import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router';
import { ThemeSelector } from '../components/ThemeSelector';
import { ImagePanel } from '../components/ui';
import { SkipLink } from './MainLayout';
import { Logo } from './SiteHeader';

export type AuthImage = 'member' | 'trainer' | 'partner' | 'default';

const IMAGES: Record<AuthImage, { alt: string; label: string; strip: string }> = {
  default: { alt: 'Athlete in a dark gym', label: 'Gym photo goes here', strip: 'Gym management for Indian fitness businesses.' },
  member: { alt: 'Member picking up a dumbbell from the rack', label: 'Member training photo goes here', strip: 'Your plan, payments and attendance in one place.' },
  trainer: { alt: 'Trainer coaching a client through a dumbbell press', label: 'Trainer with client photo goes here', strip: 'Manage your clients and bookings.' },
  partner: { alt: 'Weight room of a gym in India', label: 'Gym floor photo goes here', strip: 'Run members, fees and staff from one dashboard.' },
};

const AuthImageContext = createContext<(image: AuthImage) => void>(() => {});

type AuthPageFrameProps = {
  title: string;
  subtitle?: ReactNode;
  image?: AuthImage;
  children: ReactNode;
};

/** Heading block for auth pages. Also picks the photo shown on the right of AuthLayout. */
export function AuthPageFrame({ title, subtitle, image = 'default', children }: AuthPageFrameProps) {
  const setImage = useContext(AuthImageContext);
  useEffect(() => setImage(image), [image, setImage]);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-2 text-ink-muted">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

const AuthLayout = () => {
  const [image, setImage] = useState<AuthImage>('default');
  const current = IMAGES[image];

  return (
    <AuthImageContext.Provider value={setImage}>
      <SkipLink />
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col">
          <header className="flex h-16 items-center justify-between px-4 sm:px-8">
            <Logo />
            <ThemeSelector />
          </header>
          <p className="photo-placeholder mx-4 rounded-card px-4 py-3 text-sm font-medium sm:mx-8 lg:hidden">{current.strip}</p>
          <main id="main" tabIndex={-1} className="flex flex-1 items-center px-4 py-10 outline-none sm:px-8">
            <div className="mx-auto w-full max-w-[440px]">
              <Outlet />
            </div>
          </main>
        </div>
        <div className="sticky top-0 hidden h-dvh p-3 lg:block">
          <ImagePanel
            key={image}
            src={`/images/auth-${image}.webp`}
            alt={current.alt}
            label={current.label}
            width={1200}
            height={1500}
            priority
            className="h-full w-full [aspect-ratio:auto]!"
          />
        </div>
      </div>
    </AuthImageContext.Provider>
  );
};

export default AuthLayout;
