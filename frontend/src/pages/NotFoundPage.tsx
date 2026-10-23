import React from 'react';
import { Link } from 'react-router';
import { Dumbbell, Home } from 'lucide-react';
import { Reveal } from '../components/Reveal';

const NotFoundPage = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden bg-[var(--color-base)] dark:bg-[var(--color-base)]">
      <div className="absolute top-1/4 -left-24 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-[var(--color-accent)]/10 rounded-full blur-3xl animate-blob [animation-delay:-8s]" />

      <div className="relative z-10">
        <Reveal variant="scale">
          <div className="w-24 h-24 rounded-3xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto mb-8">
            <Dumbbell className="w-12 h-12" />
          </div>
        </Reveal>
        <Reveal delay={100}>
          <h1 className="display text-8xl md:text-9xl text-gradient leading-none">404</h1>
        </Reveal>
        <Reveal delay={200}>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--color-deepgray)] dark:text-white mt-4 mb-4">
            Looks like you lifted too heavy!
          </h2>
        </Reveal>
        <Reveal delay={300}>
          <p className="text-[var(--color-muted)] max-w-md mx-auto mb-8">
            We couldn't find the page you're looking for. It might have been moved, deleted, or you
            may have typed the URL incorrectly.
          </p>
        </Reveal>
        <Reveal delay={400}>
          <Link to="/" className="btn-primary inline-flex">
            <Home className="w-5 h-5" /> Return to Home Base
          </Link>
        </Reveal>
      </div>
    </div>
  );
};

export default NotFoundPage;
