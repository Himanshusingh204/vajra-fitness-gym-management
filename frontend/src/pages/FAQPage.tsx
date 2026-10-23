import { Link } from 'react-router';
import { PageHeader } from '../components/ui';
import { FaqList } from '../components/FaqList';
import { faqJsonLd, usePublicFaqs } from '../hooks/usePublicFaqs';
import { pageSeo, useRouteMeta } from '../hooks/usePageMeta';

export default function FAQPage() {
  const faqs = usePublicFaqs();
  useRouteMeta('/faq', [faqJsonLd(faqs)]);
  const seo = pageSeo['/faq'];

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title={seo.h1} description="Quick answers about the platform. For anything else, write to us." />
      <div className="mt-8">
        <FaqList faqs={faqs} />
      </div>
      <p className="mt-8 text-ink-muted">
        Still stuck? <Link to="/contact" className="font-semibold text-accent-ink underline underline-offset-2">Send us a message</Link>.
      </p>
    </section>
  );
}
