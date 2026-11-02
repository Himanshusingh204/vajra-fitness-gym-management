import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { mapsLink, useGymSite, whatsappLink } from './gymData';
import { GymPageIntro, EnquiryForm, Section } from './shared';

export default function GymContactPage() {
  const { gym, phone } = useGymSite();
  usePageMeta(`Contact ${gym.name}`, `Address, phone and enquiry form for ${gym.name} in ${gym.city}.`, `/gyms/${gym.id}/contact`);
  const fullAddress = `${gym.address}, ${gym.city}, ${gym.state}`;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <GymPageIntro eyebrow="Visit or enquire" title="Let’s get you through the door." description={`Questions about a membership, opening hours or your first visit? Contact ${gym.name} and the team will help you find the right next step.`} />
      <Section title="Plan your visit">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
            <div className="space-y-6">
              <a href={mapsLink(fullAddress)} target="_blank" rel="noreferrer" className="group flex gap-3 text-lg text-[var(--color-deepgray)]">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                <span className="break-words underline decoration-[var(--color-border-strong)] underline-offset-4 group-hover:decoration-[var(--color-primary)]">
                  {fullAddress}
                </span>
              </a>
              {gym.openingHours && <p className="text-sm text-[var(--color-muted)]"><span className="font-semibold text-[var(--color-deepgray)]">Opening hours:</span> {gym.openingHours}</p>}
              <div className="flex flex-wrap gap-3">
                {phone && (
                  <>
                    <a href={`tel:${phone}`} className="btn-outline"><Phone className="h-4 w-4" />Call the gym</a>
                    <a href={whatsappLink(phone)} target="_blank" rel="noreferrer" className="btn-outline"><MessageCircle className="h-4 w-4" />WhatsApp</a>
                  </>
                )}
                {gym.email && <a href={`mailto:${gym.email}`} className="btn-outline"><Mail className="h-4 w-4" />Email the gym</a>}
              </div>
              {gym.branches.length > 1 && (
                <ul className="space-y-4 border-t border-[var(--color-border)] pt-6" aria-label="Other gym locations">
                  {gym.branches.map((b) => (
                    <li key={b.id} className="text-sm">
                      <p className="font-semibold text-[var(--color-deepgray)]">{b.name}</p>
                      <a href={mapsLink(`${b.address}, ${b.city}`)} target="_blank" rel="noreferrer" className="text-[var(--color-muted)] underline underline-offset-4">{b.address}, {b.city}</a>
                      {b.phone && <a href={`tel:${b.phone}`} className="mt-0.5 block font-semibold text-[var(--color-primary)]">{b.phone}</a>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div id="enquiry" className="scroll-mt-36 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
            <p className="text-xl font-extrabold tracking-tight text-[var(--color-deepgray)]">Send a message</p>
            <p className="mb-5 mt-1 text-sm text-[var(--color-muted)]">Share a few details and the team will get back to you.</p>
            <EnquiryForm gymId={gym.id} />
          </div>
        </div>
      </Section>
    </div>
  );
}
