# Design notes

Kavach Fitness web design. The source of truth is `frontend/src/index.css`; this file only summarises it.

## Themes

Two themes: light (default) and dark. There is no system option. `useThemeStore` (`frontend/src/store/useThemeStore.ts`) adds the `dark` class and a `data-theme="dark"` attribute to `<html>`, and saves the choice in local storage. Tailwind's `dark:` variant is class based.

## Tokens

Declared as CSS variables in `index.css`, light values on `:root`, dark values under `[data-theme="dark"]`.

| Token | Light | Dark |
| --- | --- | --- |
| `--color-primary` (burgundy) | `#800020` | `#f87171` |
| `--color-primary-light` | `#a41031` | `#fca5a5` |
| `--color-primary-dark` | `#580016` | `#b91c1c` |
| `--color-secondary` (green) | `#013220` | `#34d399` |
| `--color-accent` (orange) | `#e66300` | `#fb923c` |
| `--color-base` (page background) | `#fdfaf6` | `#0d0d0d` |
| `--color-base-dark` | `#f5eedf` | `#1a1a1a` |
| `--color-surface` | `#ffffff` | `#111111` |
| `--color-charcoal` (text) | `#2a2e33` | `#f3f4f6` |
| `--color-steel` | `#71797e` | `#9ca3af` |
| `--color-muted` | `#5b6270` | `#a1a1aa` |

Borders (`--color-border`, `--color-border-strong`) and the focus ring (`--color-ring`) are translucent and also switch per theme. `--color-section-dark` (`#141618`) is used for CTA bands and the footer and stays dark in both themes.

## Type

`--font-sans` is Outfit. `--font-display` is Bebas Neue, falling back to Outfit. Both load from Google Fonts in `frontend/index.html`.

## Layout and components

- `frontend/src/layouts/MainLayout.tsx` is the public shell. `frontend/src/components/AuthSplitLayout.tsx` is the two-column layout for the sign-in and sign-up pages (form on one side, photo on the other).
- Shared pieces live in `frontend/src/components/`: `Navbar`, `ThemeSelector`, `NotificationsBell`, `ConfirmDialog`, `CookieConsent`, `PageLoader`, and the SVG charts in `charts/`.
- `components/ui/`: `DataTable` (client or server paging, sort, search, filters, export, stacked cards under 640px) with `useTableQuery` for URL state, `StatusBadge` (one status to tone map), `Wizard` (step rail, autosave note, sticky mobile footer), `FileDrop`, `DiffView` (current vs proposed), `PageHeader`.
- `components/shell/DashboardShell.tsx` is the routed dashboard frame used by `layouts/AdminLayout`, `OwnerLayout`, `MemberLayout` and `TrainerLayout`.
- `DashboardShell` has a sticky top bar on every dashboard: logo to `/`, Home and Find gyms links from md up, gym switcher from sm up, `NotificationsBell`, `ThemeSelector`, and an account menu with sign out. On phones it opens a drawer from a hamburger or the bottom "More" tab.
- Dashboards: `GymAdminDashboard`, `SuperAdminDashboard`, `MemberDashboard`, `TrainerDashboard`, `StaffDashboard`, in `frontend/src/pages/`.
- `components/gym-admin/GymProfileEditor.tsx`: business details are read-only with a "Request a change" action. The gallery upload has a star to pick the cover image.
- `components/gym-admin/TrainerInvites.tsx` manages trainer invites. `pages/superadmin/ChangeRequestsPanel.tsx` reviews change requests with `DiffView`. `pages/AcceptInvitePage.tsx` uses `AuthSplitLayout`.
- `components/GymDirectory.tsx`: search, city, facility chips, price, sort, "Near me" and paging. State lives in the URL through `useTableQuery`.
- Public gym overview (`pages/gym-site/GymOverviewPage.tsx`): full-bleed cover hero with the name in Bebas Neue. The About text lights up word by word on scroll (`.scrub-word`). The photo bento uses `grid-flow-dense`, and `.scroll-photo` grows and fades in. These use CSS scroll-driven animations in `index.css` inside `@supports (animation-timeline: ...)`, with no GSAP. Browsers without support and users with reduced motion see no motion.
- PDFs (fee receipt, workout slip) share one layout in `backend/src/utils/pdf.ts`: brand header, table with a repeating header row, totals, and "Page X of Y". Amounts print as "Rs." because the built-in font has no ₹.

## Brand assets

In `frontend/public/`: `logo.svg`, `logo-horizontal.svg`, `favicon.svg`, `branding-badge.svg`, `branding-emblem.jpg`, `og-image.png`. Concept files for the other name ideas are in `branding/` and are archived.

## Mobile

`mobile/src/theme.ts` reuses the burgundy accent (`#800020`) and the neutral surfaces from the web theme. The mobile app uses the Outfit font.

## Accessibility

Form errors use `role="alert"` and `aria-invalid`. `frontend/e2e/a11y.spec.ts` runs axe on `/` and `/login` (`npm run audit:a11y --workspace=frontend`). A manual screen reader pass has not been done.
