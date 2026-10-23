import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { Reveal } from './Reveal';

interface AuthFeature {
  title: string;
  description?: string;
}

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  badge?: string;
  title: string;
  subtitle?: string;
  imageSrc: string;
  imageAlt?: string;
  quote?: string;
  quoteAuthor?: string;
  features?: AuthFeature[];
  maxWidth?: 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl';
}

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({
  children,
  badge,
  title,
  subtitle,
  imageSrc,
  imageAlt = 'Vajra Fitness',
  quote = 'Indestructible Strength. Engineered for Modern Fitness.',
  quoteAuthor = 'Vajra Fitness System',
  features = [
    { title: 'Instant QR Entry', description: 'Fast, frictionless attendance.' },
    { title: 'Automated Billing', description: 'Integrated UPI & cards.' },
    { title: 'Bank-Grade Security', description: 'Complete role permissions.' },
  ],
  maxWidth = 'max-w-md',
}) => {
  return (
    <div className="min-h-[calc(100vh-88px)] flex items-stretch bg-[var(--color-base)] dark:bg-[var(--color-base)] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-[var(--color-accent)]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container: Split 2 Columns */}
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch my-6 lg:my-10 px-4 sm:px-6 lg:px-8 gap-8 lg:gap-12">
        {/* Left Form Column */}
        <div className={`w-full lg:w-1/2 flex flex-col justify-center py-6 sm:py-10 z-10 mx-auto ${maxWidth}`}>
          {/* Back link */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Home</span>
            </Link>
          </div>

          <Reveal variant="up">
            <div className="bg-[var(--color-surface)] dark:bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 sm:p-10 shadow-xl shadow-black/5 dark:shadow-black/30 backdrop-blur-xl relative">
              {/* Header */}
              <div className="mb-8">
                {badge && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    {badge}
                  </div>
                )}
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-deepgray)] dark:text-white mb-2.5">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm sm:text-base text-[var(--color-muted)] leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Form Content */}
              {children}
            </div>
          </Reveal>
        </div>

        {/* Right Hero Image Column (Visible on Desktop lg+) */}
        <div className="hidden lg:flex lg:w-1/2 relative rounded-3xl overflow-hidden min-h-[640px] my-auto self-stretch shadow-2xl border border-[var(--color-border)]">
          {/* Background Image */}
          <img
            src={imageSrc}
            alt={imageAlt}
            className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 hover:scale-100 transition-transform duration-1000 ease-out"
            loading="eager"
          />

          {/* Moody Gradients Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />

          {/* Top Brand Tag */}
          <div className="relative z-10 p-8 sm:p-10 flex items-center justify-between w-full">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white text-xs font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
              Vajra Operating System
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-white/70 tracking-wider uppercase">Enterprise Edition</span>
            </div>
          </div>

          {/* Bottom Card Content */}
          <div className="relative z-10 mt-auto p-8 sm:p-10 w-full flex flex-col gap-6">
            {/* Quote Card */}
            <div className="bg-black/50 backdrop-blur-xl border border-white/15 rounded-2xl p-6 text-white shadow-2xl">
              <p className="text-lg sm:text-xl font-bold tracking-tight text-white mb-2 leading-snug">
                "{quote}"
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-xs font-semibold text-white/80 tracking-wide uppercase">
                  {quoteAuthor}
                </span>
                <span className="text-xs text-[var(--color-primary-light)] font-bold">
                  Powering Champions
                </span>
              </div>
            </div>

            {/* Feature Pills */}
            {features && features.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-primary-light)] shrink-0" />
                      <span className="truncate">{feat.title}</span>
                    </div>
                    {feat.description && (
                      <span className="text-[11px] text-white/70 line-clamp-1">{feat.description}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSplitLayout;
