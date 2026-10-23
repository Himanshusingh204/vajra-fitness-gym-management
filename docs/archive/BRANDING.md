# Vajra Fitness — Brand Identity & Assets

This guide contains the official brand identity assets, vector logos, colors, and usage guidelines for Vajra Fitness.

---

## 1. Brand Concept & Meaning
**"Vajra" (वज्र)** is the mythical Sanskrit symbol of the indestructible diamond and thunderbolt. It represents unbreakable physical strength, clarity, endurance, and elite fitness.

### Brand Palette
- **Burgundy Crimson (Primary)**: `#800020` / `#9F1239` (Represents grit, power, and heritage)
- **Electric Amber Gold (Accent)**: `#FFB300` / `#F59E0B` (Represents lightning, speed, and vitality)
- **Deep Slate / Carbon (Background)**: `#0D0E10` / `#141618` (Represents modern luxury & focus)
- **Clean White (Text / Contrast)**: `#FFFFFF`

---

## 2. Official Brand Assets

All production assets are located in [`frontend/public/`](./frontend/public/):

| Asset Name | File Path | Format | Best Used For |
|---|---|---|---|
| **Primary Icon Mark** | [`frontend/public/logo.svg`](./frontend/public/logo.svg) | Vector SVG | Navigation header, footer, favicon, app icon |
| **Favicon** | [`frontend/public/favicon.svg`](./frontend/public/favicon.svg) | Vector SVG | Browser tab icon, PWA bookmarks |
| **Horizontal Sublogo** | [`frontend/public/logo-horizontal.svg`](./frontend/public/logo-horizontal.svg) | Vector SVG | Invoices, letterheads, email banners, partnerships |
| **Circular Branding Badge** | [`frontend/public/branding-badge.svg`](./frontend/public/branding-badge.svg) | Vector SVG | Merch, workout slips, certificates, stamp emblems |
| **High-Res 3D Emblem** | [`frontend/public/branding-emblem.jpg`](./frontend/public/branding-emblem.jpg) | High-Res Image | Social media avatar, mobile splash screen, marketing posters |
| **Social / Marketing Banner** | [`frontend/public/branding-banner.jpg`](./frontend/public/branding-banner.jpg) | 16:9 Image | OpenGraph preview, Twitter/X banners, YouTube/LinkedIn banners |

---

## 3. Safe Collaboration for Friends & Contributors

If you or a friend want to work on this repository without exposing personal credentials or breaking production:

1. **Production Secrets are Private**:
   - Production database URLs, Razorpay keys, and JWT secrets are **NOT** stored in this git repo.
   - They reside exclusively in the Vercel dashboard and GitHub Actions Secrets of the repository owner.
2. **Local Development Safe Mode**:
   - Clone the repo:
     ```bash
     git clone https://github.com/Himanshusingh204/vajra-fitness-gym-management.git
     cd vajra-fitness-gym-management
     ```
   - Copy `.env.example` into `.env.local` (or `backend/.env`):
     ```bash
     cp .env.example .env.local
     ```
   - Run a local Postgres container or free Neon DB instance for development.
3. **Branching & Staging**:
   - Active development can happen on the `staging` branch:
     ```bash
     git checkout staging
     git checkout -b feature/my-new-feature
     ```
   - Submit Pull Requests to `staging` (or `main` when ready to release).
