import { useState } from 'react';
import { Clock, Mail, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { fullAddress, mapsLink, useGymSite, whatsappLink } from './gymData';
import { GymPageIntro, EnquiryForm } from './shared';

export default function GymContactPage() {
  const { gym, phone } = useGymSite();
  usePageMeta(`Contact ${gym.name}`, `Address, phone and enquiry form for ${gym.name} in ${gym.city}.`, `/gyms/${gym.id}/contact`);
  const address = fullAddress(gym);
  const mapQuery = gym.lat != null && gym.lng != null ? `${gym.lat},${gym.lng}` : address;
  const [showMap, setShowMap] = useState(false);

  const actions = [
    { href: mapsLink(mapQuery), label: 'Directions', detail: gym.location || gym.city, icon: Navigation, external: true },
    phone && { href: `tel:${phone}`, label: 'Call', detail: phone, icon: Phone },
    phone && { href: whatsappLink(phone), label: 'WhatsApp', detail: phone, icon: MessageCircle, external: true },
    gym.email && { href: `mailto:${gym.email}`, label: 'Email', detail: gym.email, icon: Mail },
  ].filter((a): a is { href: string; label: string; detail: string; icon: typeof Phone; external?: boolean } => Boolean(a));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <GymPageIntro eyebrow="Visit" title="Contact and directions" description={`Call, message or get directions to ${gym.name}.`} photo={4} />

      <ul className="mt-8 grid grid-cols-2 gap-3 md:mt-12 lg:grid-cols-4">
        {actions.map((a) => (
          <li key={a.label}>
            <a
              href={a.href}
              {...(a.external ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="group flex h-full min-h-24 flex-col justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-primary)] sm:p-5"
            >
              <a.icon aria-hidden="true" className="h-5 w-5 text-[var(--color-primary)]" />
              <span className="min-w-0">
                <span className="block font-bold text-[var(--color-deepgray)]">{a.label}</span>
                <span className="block truncate text-sm text-[var(--color-muted)]">{a.detail}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <section aria-labelledby="location-heading" className="mt-12 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] md:mt-16">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">Find your way</p>
            <h2 id="location-heading" className="mt-2 text-2xl font-bold text-[var(--color-deepgray)]">Visit {gym.name}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">{address}</p>
          </div>
          <a href={mapsLink(mapQuery)} target="_blank" rel="noreferrer" className="btn-outline min-h-11"><Navigation className="h-4 w-4" /> Open directions</a>
        </div>
        {showMap ? (
          <iframe title={`Map showing ${gym.name}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-72 w-full border-0 sm:h-96" />
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-base-dark)] px-5 py-8 text-center">
            <MapPin className="h-7 w-7 text-[var(--color-primary)]" aria-hidden="true" />
            <p className="text-sm text-[var(--color-muted)]">View this location on Google Maps.</p>
            <button type="button" onClick={() => setShowMap(true)} className="btn-primary min-h-11">Show map</button>
          </div>
        )}
      </section>

      <div className="mt-12 grid gap-10 md:mt-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-8">
          {gym.openingHours && (
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--color-deepgray)]">
                <Clock className="h-5 w-5 text-[var(--color-primary)]" /> Timings
              </h2>
              <p className="mt-2 text-lg text-[var(--color-charcoal)]">{gym.openingHours}</p>
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-[var(--color-deepgray)]">Address</h2>
            <a href={mapsLink(mapQuery)} target="_blank" rel="noreferrer" className="mt-2 block break-words text-lg text-[var(--color-charcoal)] underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--color-primary)]">
              {address}
            </a>
          </div>
          {gym.branches.length > 1 && (
            <div>
              <h2 className="text-lg font-bold text-[var(--color-deepgray)]">Branches</h2>
              <ul className="mt-2 divide-y divide-[var(--color-border)]" aria-label="Other gym locations">
                {gym.branches.map((b) => (
                  <li key={b.id} className="py-3 text-sm">
                    <p className="font-semibold text-[var(--color-deepgray)]">{b.name}</p>
                    <a href={mapsLink(`${b.address}, ${b.city}`)} target="_blank" rel="noreferrer" className="text-[var(--color-muted)] underline underline-offset-4">{b.address}, {b.city}</a>
                    {b.phone && <a href={`tel:${b.phone}`} className="mt-0.5 block font-semibold text-[var(--color-primary)]">{b.phone}</a>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div id="enquiry" className="scroll-mt-36 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--color-deepgray)]">Send a message</h2>
          <p className="mb-5 mt-1 text-sm text-[var(--color-muted)]">Ask about plans, timings or a trial visit. The gym will get back to you.</p>
          <EnquiryForm gymId={gym.id} />
        </div>
      </div>
    </div>
  );
}
