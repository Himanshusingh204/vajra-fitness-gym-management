import { useEffect } from 'react';
import { useOutletContext } from 'react-router';
import type { PublicGym } from '../../api/gym.api';
import type { CarouselImage } from '../../components/ImageCarousel';

export interface GymSite {
  gym: PublicGym;
  /** path prefix for this gym's pages, e.g. /gyms/abc or /g/iron-temple */
  base: string;
  images: CarouselImage[];
  phone: string | null;
  joinUrl: string;
}

export const useGymSite = () => useOutletContext<GymSite>();

export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const INDIA_DIAL_CODE = '91';
const NATIONAL_NUMBER_LENGTH = 10;
const FALLBACK_PHOTOS = [1, 2, 3, 4, 5];
const MIN_PHOTOS = 4;

export const mapsLink = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const whatsappLink = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.length === NATIONAL_NUMBER_LENGTH ? INDIA_DIAL_CODE + digits : digits}`;
};

export const splitList = (value?: string | string[] | null) =>
  String(value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

// The gym's own cover photo first, then bundled stock photos so the carousel is never empty
export function buildImages(gym: PublicGym): CarouselImage[] {
  const urls = [gym.imageUrl, ...(gym.galleryUrls ?? [])].filter((u): u is string => Boolean(u));
  const own = urls.map((src, i) => ({ src, alt: `${gym.name} in ${gym.city}, photo ${i + 1}` }));
  const stock = FALLBACK_PHOTOS.slice(0, Math.max(0, MIN_PHOTOS - own.length)).map((n) => ({ src: `/gym/${n}.webp`, alt: 'Training floor with weights and machines' }));
  return [...own, ...stock];
}

export function useGymJsonLd(gym?: PublicGym, phone?: string | null, siteUrl?: string) {
  useEffect(() => {
    if (!gym) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': ['HealthClub', 'LocalBusiness'],
      name: gym.name,
      description: gym.tagline ?? undefined,
      url: `${siteUrl}/gyms/${gym.id}`,
      image: gym.imageUrl ?? gym.logoUrl ?? undefined,
      telephone: phone ?? undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: gym.address,
        addressLocality: gym.city,
        addressRegion: gym.state,
        addressCountry: 'IN',
      },
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [gym, phone, siteUrl]);
}
