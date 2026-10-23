import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import staticFaqs from '../seo/faqs.json';

export type Faq = { question: string; answer: string };

/** FAQPage schema for whichever list is on screen. */
export const faqJsonLd = (faqs: Faq[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
});

/** Questions managed in the admin area, falling back to the built-in list when none are published. */
export function usePublicFaqs(): Faq[] {
  const { data } = useQuery({
    queryKey: ['public-faqs'],
    queryFn: () => api.get<Faq[]>('/public/faqs').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  return data && data.length > 0 ? data : staticFaqs;
}
