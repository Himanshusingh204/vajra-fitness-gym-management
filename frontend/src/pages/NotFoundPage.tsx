import { usePageMeta } from '../hooks/usePageMeta';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  usePageMeta('Page not found', 'This page does not exist or has moved.', '', { noindex: true });
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-semibold text-accent-ink">Error 404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">We could not find that page</h1>
      <p className="mt-3 text-ink-muted">The link may be old or the address mistyped. Try the home page or search the gym directory.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to="/">Go to home</Button>
        <Button to="/gyms" variant="secondary">Find a gym</Button>
      </div>
    </section>
  );
}
