import { LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function DashboardSignOut({ compact = false }: { compact?: boolean }) {
  const logout = useAuthStore((state) => state.logout);

  return (
    <button
      type="button"
      onClick={logout}
      aria-label="Sign out"
      title="Sign out"
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] text-sm font-semibold text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${compact ? 'w-10 shrink-0' : 'w-full px-3'}`}
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
      {!compact && <span>Sign out</span>}
    </button>
  );
}
