import { ChevronDown } from 'lucide-react';
import type { Faq } from '../hooks/usePublicFaqs';

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-card border border-line bg-surface">
      {faqs.map((f) => (
        <details key={f.question} className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {f.question}
            <ChevronDown className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="px-5 pb-5 leading-relaxed text-ink-muted">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
