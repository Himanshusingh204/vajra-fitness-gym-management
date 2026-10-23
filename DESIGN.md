# VajraFitness — Design System & UI Architecture

This document outlines the visual identity, UI component architecture, token conventions, and design principles of VajraFitness. It provides a single point of truth for human engineers and automated assistants to maintain visual consistency, accessibility, and high performance across both web and mobile platforms.

---

## 1. Design Philosophy

VajraFitness blends **power and precision** with modern minimalism:
- **Clarity Over Clutter**: Data-dense interfaces (dashboards, ledgers, attendances) maintain high contrast and clear visual hierarchy without sensory overload.
- **Purposeful Color**: Color is never purely decorative; it communicates state (success, warning, error, pending) or highlights primary actions.
- **Fluid & Responsive**: Designed mobile-first, scaling smoothly to tablets, laptops, and ultra-wide desktop monitors.
- **Accessibility by Default**: Targets WCAG 2.2 AA standards across both light and dark modes with minimum 4.5:1 text contrast.

---

## 2. Color System & Theme Tokens

The design system uses Tailwind CSS v4 `@theme` tokens declared in `frontend/src/index.css`. The palette is optimized for light, dark, and system modes.

### Primary & Accent Colors

| Token | CSS Variable | Hex (Light/Dark) | Intended Usage |
|---|---|---|---|
| **Primary Accent** | `--color-accent` | `#800020` / `#9F1239` | Burgundy Crimson: Brand identity, primary CTAs, active tab highlights |
| **Hover Accent** | `--color-accent-hover` | `#6B001B` / `#BE123C` | Button hover and active states |
| **Subtle Accent** | `--color-accent-subtle` | `#8000201A` | Backgrounds for active navigation items, badges |
| **Secondary Accent** | `--color-gold` | `#FFB300` / `#F59E0B` | Electric Amber: Attention tags, star ratings, premium tier highlights |

### Surface & Background Tokens

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--surface-canvas` | `#FFFFFF` | `#0D0E10` | Base page background |
| `--surface-subtle` | `#F8FAFC` | `#141618` | Cards, sidebars, nested containers |
| `--surface-elevated`| `#FFFFFF` | `#1A1D20` | Modals, dropdowns, sticky headers |
| `--border-subtle` | `#E2E8F0` | `#272A30` | Dividers, card borders, table rows |
| `--border-strong` | `#CBD5E1` | `#3F444E` | Form inputs, interactive borders |

### Text & Ink Hierarchy

| Token | Light Mode | Dark Mode | Contrast Ratio |
|---|---|---|---|
| `--ink-strong` | `#0F172A` | `#F8FAFC` | 14:1 (Headings, primary values) |
| `--ink-default`| `#334155` | `#E2E8F0` | 9:1 (Body text, form labels) |
| `--ink-muted`  | `#64748B` | `#94A3B8` | 4.8:1 (Secondary descriptions, timestamps) |
| `--ink-faint`  | `#94A3B8` | `#64748B` | Disabled states, placeholder text |

### Status Colors

- **Success**: `#10B981` (Green) — Paid fees, active memberships, approved accounts.
- **Warning**: `#F59E0B` (Amber) — Expiring memberships, overdue notices, pending approvals.
- **Error**: `#EF4444` (Crimson Red) — Failed payments, rejected accounts, validation errors.
- **Info**: `#3B82F6` (Blue) — General system notices, neutral activity logs.

---

## 3. Typography Hierarchy

VajraFitness utilizes two complementary typefaces:
- **Heading & Display**: **Outfit** — A clean geometric sans-serif delivering contemporary, athletic presence.
- **Body & Data**: **Inter** — Optimized for legibility at small sizes, data tables, and rapid scanning.

### Type Scale

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display** | 3rem (48px) | 700 Bold | 1.15 | Marketing hero titles |
| **H1** | 2rem (32px) | 700 Bold | 1.25 | Primary page titles |
| **H2** | 1.5rem (24px) | 600 SemiBold | 1.3 | Section headers, card titles |
| **H3** | 1.25rem (20px) | 600 SemiBold | 1.4 | Subsection titles, modal headers |
| **Body Large** | 1.125rem (18px) | 400 Regular | 1.5 | Hero subtext, feature callouts |
| **Body** | 0.9375rem (15px) | 400 Regular | 1.5 | Default UI text, table rows |
| **Caption** | 0.8125rem (13px) | 500 Medium | 1.4 | Badges, timestamps, input helper text |

---

## 4. UI Kit & Component Architecture

Reusable atomic components reside in [`frontend/src/components/ui/`](./frontend/src/components/ui/):

### Core Components
1. **`Button`**:
   - Variants: `primary` (burgundy solid), `secondary` (subtle slate border), `ghost` (transparent hover), `destructive` (red solid).
   - Sizes: `sm` (compact tables), `md` (standard forms), `lg` (hero CTAs).
   - Border radius: `rounded-lg` (10px).
2. **`Input` & `Select`**:
   - Built-in floating labels or explicit labels.
   - Distinct focus rings using `--color-accent` with a 2px offset.
   - Error states with accompanying `aria-invalid` and validation error text.
3. **`Card`**:
   - `rounded-2xl` (14px) with subtle 1px border (`--border-subtle`).
   - Padding options: `sm` (16px), `md` (24px), `lg` (32px).
4. **`Badge`**:
   - Pill-shaped (`rounded-full`) indicators for statuses: `Active`, `Expired`, `Pending`, `Trial`.
5. **`Dialog` & `Modal`**:
   - Accessible keyboard-trapping dialogs with backdrop blur (`backdrop-blur-sm`).

---

## 5. Layout Architecture

### Shells & Layouts
- **`MainLayout`**: Public site shell with global navigation header ([`SiteHeader`](./frontend/src/layouts/SiteHeader.tsx)) and footer ([`SiteFooter`](./frontend/src/layouts/SiteFooter.tsx)).
- **`AuthLayout`**: Split-screen authentication layout featuring the login/signup form on the left and a high-resolution contextual fitness visual on the right.
- **`AppShell`**: Role-based internal dashboard layout featuring:
  - Collapsible sidebar with role-aware navigation links.
  - Sticky topbar containing breadcrumbs, branch selector, gym switcher, notification center, and theme selector.
  - Mobile bottom navigation bar for quick access on narrow screens.

### Grid & Spacing System
- Base grid unit: **4px** (`rem` increments).
- Typical container max-widths:
  - Public marketing pages: `max-w-7xl` (1280px).
  - Auth forms: `max-w-md` (448px).
  - Admin tables & dashboards: Fluid `max-w-[1600px]` with horizontal scroll safety.

---

## 6. Motion & Micro-Interactions

- Transitions use standard `cubic-bezier(0.16, 1, 0.3, 1)` easing for snappy feel.
- Duration tokens:
  - Micro (hover, focus, tooltips): `150ms`.
  - Content shifts (accordion expand, drawer toggle): `250ms`.
  - Page transitions: `300ms`.
- Respects `prefers-reduced-motion: reduce` by disabling non-essential transitions.

---

## 7. Mobile App Alignment (`mobile/`)

The React Native / Expo application (`mobile/`) reflects the web design tokens:
- **Theme File**: `mobile/src/theme.ts` mirrors the hex values for burgundy (`#800020`), slate surfaces, and gold accents.
- **Typography**: Matches Outfit and Inter font families loaded via Expo Google Fonts.
- **Native Elevation**: Uses iOS shadow parameters and Android elevation values matching the web `shadow-sm` and `shadow-md` layers.

---
