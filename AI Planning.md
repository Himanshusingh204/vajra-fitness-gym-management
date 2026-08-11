# MASTER DEVELOPMENT PROMPT — VAJRA FITNESS

## Production-Ready Full-Stack Multi-Gym SaaS Management Platform

You are acting as a **Senior Full-Stack Engineer, SaaS Architect, Database Engineer, Security Engineer, UI/UX Designer, QA Engineer, and DevOps Engineer**.

You are working on an EXISTING project called:

# VajraFitness

VajraFitness is a premium multi-gym management SaaS platform designed primarily for gyms in India.

This is NOT a new project.

The existing application already contains frontend code, backend APIs, authentication, database models, dashboards, gym management functionality, and UI components.

Your responsibility is to:

1. Audit the existing project.
2. Understand the complete existing architecture.
3. Preserve working functionality.
4. Fix broken/incomplete functionality.
5. Complete missing full-stack workflows.
6. Improve security and data integrity.
7. Improve database architecture where necessary.
8. Connect all frontend functionality to real backend APIs.
9. Complete all dashboards.
10. Improve UI/UX.
11. Test the entire system.
12. Make the application production-ready.

DO NOT blindly rebuild the application.

DO NOT replace working systems simply because you prefer another implementation.

DO NOT remove existing features unless they are clearly obsolete, duplicated, insecure, or broken.

---

# 1. CURRENT TECHNOLOGY STACK

Maintain the existing stack unless there is a strong technical reason to modify something.

## Frontend

- React 19
- TypeScript
- Vite
- React Router
- Zustand
- TanStack Query
- Tailwind CSS v4
- React Hook Form
- Zod
- Axios

## Backend

- Node.js
- Express 5
- TypeScript
- Prisma ORM
- PostgreSQL for production
- SQLite may be used for simple local development if already configured
- JWT authentication
- HTTP-only refresh-token cookies
- Argon2id preferred for new password hashing
- Helmet
- CORS
- PDFKit

Before adding another dependency, determine whether the existing stack can already solve the problem.

Avoid unnecessary dependencies.

---

# 2. FIRST ACTION — COMPLETE PROJECT AUDIT

BEFORE WRITING OR MODIFYING MAJOR CODE:

Inspect the entire repository.

Analyze:

- frontend/
- backend/
- package.json files
- Prisma schema
- migrations
- controllers
- services
- routes
- middleware
- authentication
- authorization
- API client
- Zustand stores
- TanStack Query implementation
- forms
- dashboards
- reusable components
- layouts
- environment variables
- utilities
- existing CSS/theme
- public pages
- protected routes
- role permissions
- error handling
- loading states
- existing tests
- build configuration

Create an internal implementation checklist.

Classify functionality as:

- COMPLETE
- PARTIALLY IMPLEMENTED
- BROKEN
- FRONTEND ONLY
- BACKEND ONLY
- MISSING
- DUPLICATED
- SECURITY RISK
- NEEDS REFACTORING

Do not assume something is missing simply because it is not immediately visible.

Search the repository first.

---

# 3. NON-DESTRUCTIVE DEVELOPMENT RULE

This is extremely important.

Preserve all working functionality.

Before changing an existing implementation:

1. Understand why it exists.
2. Find where it is used.
3. Check frontend dependencies.
4. Check backend dependencies.
5. Check database relationships.
6. Check role permissions.
7. Check whether another module depends on it.

Prefer extending/refactoring existing systems over replacing them.

Do not rename APIs, database fields, routes, environment variables, or components unnecessarily.

If a breaking change is genuinely necessary, update every dependent part of the application.

---

# 4. APPLICATION ARCHITECTURE

The platform should ultimately provide five major experiences:

## A. Public Website

For visitors and prospective customers.

## B. Super Admin

For managing the entire VajraFitness SaaS platform.

## C. Gym Admin

For gym owners/managers.

## D. Trainer

For trainers working inside a gym.

## E. Member

For gym members.

Maintain strict separation between permissions for these roles.

---

# 5. ROLE-BASED ACCESS CONTROL

Existing roles include:

SUPER_ADMIN

GYM_ADMIN

TRAINER

STAFF

MEMBER

RBAC must be enforced at BOTH:

Frontend route/UI level

AND

Backend API level.

Never depend only on hiding frontend buttons.

Users must never access data belonging to another gym unless their role explicitly allows it.

SUPER_ADMIN can access platform-wide information.

GYM_ADMIN can access gyms they own/manage.

TRAINER can access only permitted trainer functionality and assigned/relevant gym data.

STAFF receives only operational permissions granted to staff.

MEMBER can access only their own permitted information.

Protect against IDOR vulnerabilities.

Never trust `gymId`, `memberId`, `userId`, or similar identifiers supplied by the client without authorization verification.

---

# 6. AUTHENTICATION SYSTEM

Audit and complete authentication.

Required flows:

- Login
- Logout
- Access token
- Refresh token
- HTTP-only refresh-token cookie
- Automatic access-token refresh
- Protected routes
- Role authorization
- Account activation
- Forgot password
- Reset password
- Email verification where appropriate
- Change password
- Session expiration
- Suspended account blocking

Access tokens should remain short-lived.

Refresh tokens should be handled securely.

Do not expose authentication secrets through frontend JavaScript.

---

# 7. REMOVE INSECURE DEFAULT MEMBER PASSWORDS

Do NOT use a universal production password such as:

member123

For admin-created members use a secure onboarding mechanism.

Preferred flow:

Admin creates member

→ system generates secure activation token

→ member receives activation/onboarding link

→ member chooses their password

→ account becomes activated.

If email infrastructure is unavailable during local development, implement a safe development mechanism without creating a universal production password.

Seed/demo accounts may exist ONLY for development environments.

Never expose demo credentials in production.

---

# 8. PASSWORD SECURITY

Use Argon2id for newly generated password hashes unless compatibility requirements make another approach necessary.

If existing bcrypt hashes exist, do not destroy user accounts.

Support migration/compatibility if required.

Passwords must never be stored in plaintext.

Never log passwords, reset tokens, JWT secrets, refresh tokens, or sensitive credentials.

---

# 9. MULTI-TENANT DATA SECURITY

VajraFitness is a multi-gym system.

Every gym-specific resource must be correctly scoped.

Examples:

members

trainers

staff

attendance

fees

payments

workouts

PT bookings

enquiries

plans

notifications

reports

settings

A Gym Admin from Gym A must never be able to access Gym B by manipulating URLs or API requests.

Implement authorization checks centrally wherever practical.

---

# 10. GYM MEMBERSHIP SYSTEM

Maintain existing membership-plan functionality and improve the complete membership lifecycle.

Each membership should support appropriate fields such as:

- member
- gym
- plan
- start date
- end date
- original amount
- discount
- final amount
- payment status
- membership status
- renewal information
- created date
- updated date

Use the existing schema where possible rather than duplicating concepts.

Membership lifecycle should support:

PENDING

ACTIVE

EXPIRING_SOON

EXPIRED

SUSPENDED

CANCELLED

where appropriate.

Do not necessarily store EXPIRING_SOON if it is better calculated dynamically.

Implement automatic expiry handling.

Do not rely entirely on administrators manually marking memberships expired.

---

# 11. MEMBERSHIP RENEWALS

Create a proper renewal workflow.

Admin should be able to renew a membership.

Member may request/pay for renewal where supported.

Preserve historical membership/payment records.

Do not overwrite financial history when renewing.

Provide:

- previous plan
- new/current plan
- renewal date
- new expiration date
- amount
- payment
- receipt

---

# 12. MEMBERSHIP EXPIRY & REMINDERS

Implement an architecture for reminders such as:

- membership expiring soon
- membership expired
- fee due
- overdue payment
- PT session reminder

Do not hard-code the system to one notification provider.

Use a notification/service architecture that can later support:

- in-app notifications
- email
- SMS
- WhatsApp

Initially, in-app notifications are sufficient if external integrations are unavailable.

---

# 13. PAYMENT & FEE MANAGEMENT

Existing fee-management functionality must remain operational.

Support:

- membership fee
- pending payment
- partial payment if compatible with existing model
- paid payment
- overdue payment
- payment history
- receipts
- payment notes
- payment date
- payment method
- transaction/reference ID

Support manual/offline payment methods:

- Cash
- UPI
- Card
- Bank Transfer
- Other

Admins must be able to record offline payments.

---

# 14. ONLINE PAYMENT ARCHITECTURE

Prepare or implement a proper online payment architecture suitable for India.

A provider such as Razorpay can be integrated if credentials/configuration are available.

Do NOT fake successful payments.

Required secure flow:

Member chooses plan/payment

→ backend creates payment order

→ payment provider processes transaction

→ backend verifies payment

→ webhook verification where applicable

→ payment recorded

→ membership updated/activated

→ receipt generated.

Never trust a frontend "payment successful" flag.

Verify payments server-side.

Keep payment-provider logic isolated in a service layer.

---

# 15. RECEIPTS

Maintain the existing PDFKit implementation.

Fee/payment receipts should contain appropriate information such as:

- gym information
- member information
- receipt number
- payment date
- membership plan
- amount
- discount
- final amount
- payment method
- transaction/reference number
- payment status

Receipt authorization must be enforced.

Members can download only their own receipts.

Gym Admin can download receipts belonging to their authorized gym.

Super Admin can access them where appropriate.

---

# 16. ATTENDANCE SYSTEM

Complete attendance functionality.

Gym Admin/Staff functionality:

- member check-in
- checkout if architecture supports it
- manual attendance
- today's attendance
- attendance history
- search member
- filter by date
- filter by member
- export attendance

Member functionality:

- own attendance history
- monthly attendance
- attendance count
- attendance streak where useful

Prevent unauthorized gym attendance records.

Avoid accidental duplicate check-ins where appropriate.

---

# 17. QR ATTENDANCE — OPTIONAL SECONDARY FEATURE

Architect attendance so QR check-in can be added cleanly.

If implementing QR attendance:

- use short-lived or secure QR validation
- verify member
- verify gym
- verify membership status
- prevent replay/duplicate check-in
- record server timestamp

Do not make QR attendance a dependency for normal attendance.

Manual attendance must continue working.

Do NOT add biometric hardware integration at this stage.

---

# 18. WORKOUT MANAGEMENT

Maintain existing digital workout slips.

Gym Admin and authorized Trainers should be able to:

- create workout plans
- assign workouts
- edit appropriate workouts
- view member workouts
- download workout PDFs

Workout information may contain:

- exercise
- sets
- reps
- rest
- weight
- notes
- training day
- muscle group

Use existing models where possible.

Do not create duplicate workout systems if one already exists.

---

# 19. PERSONAL TRAINING / PT BOOKING

This is a required unfinished feature.

Complete it FULL STACK.

Backend:

Create/fix appropriate Prisma models, validation, controllers, services, routes, authorization and business rules.

Frontend:

Create complete booking UI connected to real APIs.

Member should be able to:

- browse eligible trainers
- view basic trainer information
- choose date/time
- request/book PT session
- view upcoming sessions
- view previous sessions
- cancel where allowed

Trainer should be able to:

- view bookings
- view today's sessions
- view upcoming sessions
- approve/reject if approval workflow is used
- mark session completed
- cancel/reschedule where permitted

Gym Admin should be able to:

- view gym PT bookings
- manage bookings
- resolve scheduling issues

Prevent:

- duplicate booking
- invalid time slots
- booking trainers from unauthorized gyms
- booking past dates
- conflicting sessions where practical

Use server-side validation.

---

# 20. MEMBER DASHBOARD

Complete and redesign the Member Dashboard.

Recommended navigation:

Dashboard

My Membership

My Workout

Attendance

Payments

Personal Training

Receipts

Notifications

Profile

Account Settings

Dashboard overview should display useful information such as:

- current membership
- membership status
- days remaining
- current plan
- pending amount
- today's/current workout
- recent attendance
- upcoming PT session
- recent notifications

Do not overload members with business analytics.

All information must come from real backend APIs.

No fake dashboard numbers.

---

# 21. TRAINER DASHBOARD

Build a functional Trainer Dashboard.

Recommended navigation:

Dashboard

Assigned Members

Workout Plans

PT Bookings

Schedule

Member Progress

Notifications

Profile

Trainer overview:

- assigned members
- today's PT sessions
- upcoming sessions
- recent workout assignments
- schedule

Trainer permissions must remain limited.

Trainer should NOT receive unrestricted access to:

- gym revenue
- platform analytics
- unrelated members
- SaaS settings
- sensitive owner information

---

# 22. STAFF DASHBOARD

If STAFF is maintained as a distinct role, give it a clear purpose.

Possible staff capabilities:

- member lookup
- attendance
- enquiries
- basic member operations
- permitted fee collection
- operational dashboard

Do not simply duplicate Gym Admin permissions.

Implement the minimum privilege required.

---

# 23. GYM ADMIN DASHBOARD

Create a powerful but clean Gym Admin workspace.

Navigation:

Dashboard

Members

Membership Plans

Attendance

Payments & Fees

Trainers

Staff

Workout Plans

PT Bookings

Enquiries

Reports

Notifications

Gym Settings

Dashboard metrics should include real data:

- total members
- active members
- pending members
- expiring memberships
- expired memberships
- monthly revenue
- pending fees
- today's check-ins
- trainers
- staff
- enquiries

Charts may include:

- monthly revenue trend
- member growth
- attendance trend
- membership-plan distribution

Do not generate random chart data.

---

# 24. MEMBER MANAGEMENT

Gym Admin should be able to:

- view members
- add member
- approve registration
- edit member
- activate/suspend where appropriate
- assign/change membership
- view membership history
- view payment history
- view attendance
- view workouts
- view PT sessions

Provide:

- search
- filters
- pagination
- status filters
- plan filters

Do not load thousands of members into the browser at once.

Implement server-side pagination where appropriate.

---

# 25. TRAINER & STAFF MANAGEMENT

Gym Admin should be able to:

- add trainer
- add staff
- edit profiles
- activate/deactivate
- assign roles
- remove/deactivate accounts safely

Avoid destructive deletion when historical records depend on the user.

Prefer soft-deactivation where appropriate.

---

# 26. ENQUIRY / LEAD MANAGEMENT

Maintain existing enquiry functionality.

Support:

- public website enquiries
- walk-in enquiries
- source
- contact details
- notes
- status
- follow-up date
- assigned staff if useful

Potential statuses:

NEW

CONTACTED

FOLLOW_UP

CONVERTED

LOST

Allow conversion from enquiry to member without unnecessary duplicate data entry.

---

# 27. REPORTS

Create useful Gym Admin reports.

Examples:

- revenue report
- payment report
- pending fees
- membership report
- expiring memberships
- attendance report
- member growth
- trainer/PT activity

Provide date filtering.

Where appropriate support:

- CSV export
- Excel-compatible export
- PDF report

Do not generate fake report data.

---

# 28. SUPER ADMIN

Maintain and improve the existing Super Admin functionality.

Recommended navigation:

Platform Overview

Gyms

Gym Approvals

Users

SaaS Plans

Subscriptions

Platform Revenue

Support Tickets

CMS

Audit Logs

Platform Settings

Super Admin should be able to:

- approve gym
- suspend gym
- activate/suspend user
- view platform analytics
- manage CMS
- handle support tickets
- inspect audit logs

All actions should have appropriate authorization.

---

# 29. IMPORTANT — TWO DIFFERENT TYPES OF PLANS

Do not confuse:

## Gym Membership Plans

Purchased by gym MEMBERS.

Example:

Monthly

Quarterly

Half-Yearly

Annual

with:

## VajraFitness SaaS Plans

Purchased by GYM OWNERS for using the VajraFitness platform.

These are separate business concepts.

Use separate models/services/routes/UI.

Never mix their payment records or subscription logic.

---

# 30. SAAS SUBSCRIPTION SYSTEM

Design a clean SaaS subscription architecture.

Possible plans:

STARTER

PRO

ENTERPRISE

Plan limits may include:

- number of gyms/branches
- number of members
- number of trainers/staff
- advanced reports
- selected premium features

Do not hard-code limits throughout random frontend components.

Centralize subscription entitlement logic.

If full SaaS billing is not implemented now, architect the database/service layer so it can be introduced without rewriting the gym-membership system.

---

# 31. PUBLIC WEBSITE

Create/refine a premium public-facing website.

Recommended pages:

Home

Features

For Gym Owners

Pricing

Find a Gym

About

Contact

FAQ

Login

Register Gym

Join Gym

Privacy Policy

Terms & Conditions

Public content should use real backend content where applicable.

Approved gyms should come from the API.

Plans should come from the API.

FAQ/testimonials should use CMS data.

Contact forms should use the real enquiry/contact backend.

Do not create fake functionality.

---

# 32. HOME PAGE

Create a polished SaaS landing page.

Suggested sections:

Hero

Trusted/Platform Stats

Problems VajraFitness Solves

Core Features

How It Works

Role-Based Platform Preview

Gym Management Features

Member Experience

Analytics Preview

Testimonials

Pricing

FAQ

CTA

Footer

Avoid excessive marketing text.

Keep copy clear, modern and credible.

---

# 33. UI/UX DESIGN DIRECTION

The application should feel like a premium modern SaaS product.

Design qualities:

- professional
- clean
- modern
- spacious
- high readability
- consistent
- responsive
- premium without being flashy

Create a consistent design system for:

- colors
- typography
- spacing
- radius
- shadows
- buttons
- inputs
- cards
- tables
- dialogs
- dropdowns
- badges
- alerts
- tooltips
- navigation

Do not redesign each page independently.

Maintain visual consistency throughout the application.

---

# 34. GLASSMORPHISM

Use glassmorphism selectively.

Good locations:

- public navbar
- hero overlays
- selected marketing cards
- premium CTA areas

Avoid excessive glass effects in:

- data tables
- large forms
- financial dashboards
- admin data-heavy screens

Readability is more important than visual effects.

---

# 35. DASHBOARD DESIGN

Dashboards should prioritize usability.

Use:

- clear sidebar
- top navigation/header
- breadcrumbs where useful
- KPI cards
- charts
- tables
- filters
- search
- status badges
- contextual actions
- modals/drawers where appropriate

Navigation should remain predictable.

Do not hide essential actions simply to make the UI minimal.

---

# 36. ANIMATION RULES

Use animations intentionally.

Recommended:

- subtle page transitions
- skeleton loading
- modal transitions
- dropdown transitions
- accordion animation
- toast animation
- subtle card hover
- small button interactions
- public-page scroll reveal
- chart animation

Avoid:

- constant movement
- excessive parallax
- large floating elements inside dashboards
- text reveal on every heading
- repeated bounce effects
- animations that delay user actions
- animations on every dashboard card

Animations must never make the application slower.

Respect:

prefers-reduced-motion

Target smooth performance.

Use Framer Motion only where it provides meaningful value.

Do not add multiple animation libraries unnecessarily.

---

# 37. RESPONSIVE DESIGN

Every page must work correctly on:

- mobile
- tablet
- laptop
- desktop
- large desktop

Test especially:

- navigation
- sidebars
- tables
- charts
- forms
- modals
- dropdowns
- cards
- dashboards

Large tables should have appropriate mobile behavior.

No horizontal page overflow.

No overlapping UI.

No unreadable text.

---

# 38. LOADING STATES

Every asynchronous feature should have a professional loading state.

Use:

- skeleton loaders
- button loading indicators
- table skeletons
- dashboard skeletons

Avoid blank screens.

Avoid unnecessary full-page spinners.

---

# 39. EMPTY STATES

Every data-driven page should have a meaningful empty state.

Examples:

No members yet

No payments found

No attendance records

No upcoming PT sessions

No enquiries

No notifications

Provide an appropriate action when useful.

Example:

"No members yet — Add your first member."

---

# 40. ERROR STATES

Never silently fail.

Provide user-friendly errors.

Examples:

Unable to load members.

Payment verification failed.

You do not have permission to perform this action.

Session expired. Please sign in again.

Log technical details appropriately on the server without exposing stack traces or sensitive information to normal users.

---

# 41. FORM VALIDATION

Use React Hook Form + Zod where appropriate.

Validation must exist on BOTH:

frontend

and

backend.

Never trust frontend validation alone.

Provide useful field-level error messages.

Validate:

- emails
- phone numbers
- amounts
- dates
- IDs
- statuses
- required fields
- enum values

Use Indian phone-number handling appropriately without making unrealistic assumptions about every user's format.

---

# 42. SEARCH, FILTERING & PAGINATION

Implement consistent patterns.

Pages such as:

Members

Payments

Attendance

Trainers

Staff

Enquiries

Gyms

Users

Bookings

Audit Logs

should support relevant combinations of:

- search
- filters
- sorting
- pagination

Use server-side querying for potentially large datasets.

Debounce search where appropriate.

---

# 43. NOTIFICATIONS

Create a centralized notification system.

Notification examples:

- membership expiring
- payment due
- payment received
- PT booking created
- PT booking approved
- PT booking cancelled
- gym registration approved
- member registration approved
- account-related notification

Support:

- unread/read
- mark as read
- mark all as read
- notification timestamp
- notification type
- relevant navigation target

Do not tightly couple notifications to one external provider.

---

# 44. AUDIT LOGGING

Maintain/improve audit logs for important administrative actions.

Examples:

- gym approved
- gym suspended
- user suspended
- membership modified
- payment manually recorded
- staff created
- trainer removed
- sensitive setting changed

Store useful metadata without logging passwords, tokens or secrets.

---

# 45. SECURITY HARDENING

Perform a complete security audit.

Verify:

- Helmet
- CORS
- secure cookies
- HTTP-only cookies
- SameSite configuration
- production Secure cookies
- rate limiting
- request body limits
- input validation
- authorization
- IDOR prevention
- password hashing
- token expiration
- refresh-token security
- safe error responses
- environment secret handling
- Prisma query safety
- file/PDF endpoint authorization

Add rate limits especially for:

- login
- registration
- password reset
- contact forms
- public enquiries
- token refresh where appropriate

Do not expose stack traces in production.

---

# 46. DATABASE INTEGRITY

Review Prisma schema carefully.

Ensure appropriate:

- foreign keys
- relations
- unique constraints
- indexes
- cascading behavior
- nullable fields
- enums
- timestamps

Add indexes to frequently queried fields where justified.

Examples may include:

gymId

memberId

userId

status

createdAt

payment status

membership end date

Do not add indexes blindly.

Use migrations safely.

Do not destroy existing data unnecessarily.

---

# 47. DATABASE ENVIRONMENTS

Production target:

PostgreSQL.

Local development may use PostgreSQL or the project's existing SQLite configuration.

Do not create schema behavior that works only in SQLite but fails in PostgreSQL.

Document database setup clearly.

---

# 48. DATABASE BACKUPS

Document a production backup strategy.

Include recommendations for:

- automated backups
- retention
- restore testing
- migration backups

Do not claim the application itself guarantees backups if backups are actually handled by the hosting/database provider.

---

# 49. API ARCHITECTURE

Maintain clean separation:

Routes

→ Middleware

→ Controllers

→ Services

→ Prisma/database

Avoid putting large amounts of business logic directly in route files.

Use centralized:

- error handling
- authentication
- authorization
- validation
- logging

Keep API responses consistent.

---

# 50. API RESPONSE QUALITY

Where practical, standardize responses.

Example successful response concept:

{
"success": true,
"data": {},
"message": "..."
}

Error concept:

{
"success": false,
"message": "...",
"errors": []
}

Do not expose internal stack traces.

Do not rewrite every existing endpoint merely to satisfy this shape if doing so creates unnecessary breaking changes.

Consistency matters more than blindly enforcing a new format.

---

# 51. FRONTEND API ARCHITECTURE

Centralize Axios/API configuration.

Maintain automatic:

401

→ refresh token

→ retry original request

flow.

Prevent infinite refresh loops.

Handle refresh failure by safely logging the user out.

Use TanStack Query correctly for server state.

Do not duplicate server data unnecessarily in Zustand.

Use Zustand mainly for appropriate client/global state.

---

# 52. ACCESSIBILITY

Target WCAG-friendly implementation.

Ensure:

- semantic HTML
- sufficient contrast
- keyboard navigation
- visible focus states
- accessible forms
- meaningful labels
- accessible dialogs
- ARIA where actually needed
- reduced motion support

Do not add unnecessary ARIA to native semantic elements.

---

# 53. PERFORMANCE

Optimize for strong real-world performance.

Implement where appropriate:

- route-level code splitting
- lazy loading
- image optimization
- query caching
- pagination
- memoization only where useful
- efficient Prisma queries
- selective field retrieval
- avoiding N+1 queries
- bundle optimization

Prevent unnecessary React re-renders.

Do not sacrifice maintainability for meaningless micro-optimizations.

---

# 54. SEO

SEO primarily applies to the public website.

Implement:

- descriptive page titles
- meta descriptions
- canonical URLs where applicable
- Open Graph metadata
- semantic headings
- sitemap
- robots.txt
- structured data where genuinely useful

Do not attempt to SEO private dashboards.

---

# 55. LEGAL / TRUST PAGES

Create professional placeholders/structures for:

Privacy Policy

Terms & Conditions

Contact

Support

Do not invent legal guarantees.

Clearly mark content requiring business/legal review if necessary.

---

# 56. TESTING

Do not consider a feature complete simply because the UI renders.

Test important workflows.

At minimum verify:

Authentication

Authorization

Gym isolation

Member registration

Member approval

Membership creation

Membership renewal

Fee/payment creation

Receipt authorization

Attendance

Workout assignment

PT booking

Trainer permissions

Member permissions

Gym Admin permissions

Super Admin permissions

Suspended users

Token refresh

Invalid inputs

Unauthorized resource access

Add automated tests where practical, prioritizing security-sensitive and business-critical backend behavior.

---

# 57. BUILD & QUALITY CHECKS

Before declaring completion run appropriate project commands such as:

frontend build

backend build

TypeScript checks

lint

tests

Prisma validation

Prisma generation

Do not simply hide errors.

Fix the root cause.

Do not disable TypeScript checks just to make the build pass.

Do not fill the project with:

any

@ts-ignore

eslint-disable

unless genuinely justified.

---

# 58. ENVIRONMENT VARIABLES

Create/update `.env.example`.

Never commit real secrets.

Document variables such as:

DATABASE_URL

JWT_SECRET

REFRESH_TOKEN_SECRET if separate

FRONTEND_URL

API URL

payment credentials

email credentials

production environment settings

Do not expose backend secrets through `VITE_` environment variables.

Only public frontend configuration should use frontend-exposed environment variables.

---

# 59. DEVELOPMENT VS PRODUCTION

Maintain clear environment behavior.

Development may include:

- seed accounts
- debug logging
- local database
- test data

Production must NOT expose:

- demo credentials
- seed passwords
- stack traces
- debug endpoints
- secret keys
- database credentials

---

# 60. FEATURES NOT TO ADD RIGHT NOW

Do NOT expand the project unnecessarily.

Do not add unless explicitly requested later:

- AI workout generator
- AI diet generator
- social network/feed
- ecommerce supplement store
- live video calls
- biometric attendance hardware
- complex gamification
- cryptocurrency
- unnecessary blockchain
- full native mobile app
- dozens of external integrations

Focus on completing the core gym-management SaaS product first.

---

# 61. CODE QUALITY

Code should be:

- modular
- readable
- maintainable
- typed
- documented where necessary
- reusable without over-engineering

Avoid:

- giant components
- giant controllers
- duplicate API calls
- duplicated validation
- duplicated UI
- magic numbers
- hard-coded URLs
- hard-coded secrets
- dead code
- console spam
- unused dependencies

Create reusable abstractions where repetition genuinely exists.

---

# 62. DO NOT USE FAKE DATA TO HIDE MISSING FUNCTIONALITY

This rule is critical.

Do NOT make dashboards look complete using hard-coded:

- revenue
- users
- members
- attendance
- bookings
- analytics
- notifications

If the backend functionality is missing:

BUILD IT.

Then connect the UI to it.

If functionality intentionally remains unavailable, show an appropriate empty/unavailable state rather than fabricated information.

---

# 63. IMPLEMENTATION PRIORITY

Follow this priority unless repository dependencies require a slightly different order.

## PHASE 1 — AUDIT & STABILITY

Audit repository.

Fix build errors.

Fix TypeScript errors.

Fix broken API connections.

Fix database issues.

Fix authentication.

Fix authorization.

Fix auto-login/registration flow.

Remove insecure password fallback.

---

## PHASE 2 — CORE BUSINESS LOGIC

Complete:

Member lifecycle

Membership lifecycle

Membership renewals

Membership expiry

Fees

Payments

Attendance

Workout management

PT booking

Notifications foundation

---

## PHASE 3 — ROLE DASHBOARDS

Complete:

Member Dashboard

Trainer Dashboard

Staff functionality

Gym Admin Dashboard

Super Admin Dashboard

All dashboards must use real data.

---

## PHASE 4 — MANAGEMENT FEATURES

Complete:

Members

Trainers

Staff

Enquiries

Reports

Search

Filtering

Pagination

Exports

Notifications

Audit logs

---

## PHASE 5 — SAAS PLATFORM

Separate gym memberships from SaaS subscriptions.

Implement/prepare:

SaaS plans

Gym subscriptions

Entitlements

Plan limits

Subscription administration

---

## PHASE 6 — PUBLIC WEBSITE

Complete:

Home

Features

For Gym Owners

Pricing

Find Gym

About

Contact

FAQ

Authentication entry pages

Legal pages

---

## PHASE 7 — UI/UX POLISH

After functionality works:

Improve:

layout

typography

spacing

colors

cards

tables

forms

navigation

responsive behavior

loading states

empty states

error states

animations

accessibility

Do not prioritize animation over broken functionality.

---

## PHASE 8 — SECURITY & PERFORMANCE

Perform:

security audit

RBAC audit

IDOR testing

rate limiting

database optimization

frontend performance optimization

API optimization

accessibility audit

responsive audit

---

## PHASE 9 — FINAL QA

Run:

build

lint

type checks

tests

database validation

critical workflow testing

mobile testing

desktop testing

permission testing

security-sensitive route testing.

Fix discovered issues.

---

# 64. README CLEANUP

Rewrite/update the README after implementation.

README should document the PROJECT.

Do not leave giant AI development instructions inside the normal README.

README should contain:

- project overview
- major features
- architecture
- tech stack
- folder structure
- prerequisites
- installation
- environment setup
- database setup
- development commands
- build commands
- role overview
- API overview
- security notes
- deployment overview
- license

Move development plans/TODO instructions to a separate file such as:

DEVELOPMENT_PLAN.md

if useful.

---

# 65. FINAL DEFINITION OF DONE

The application is NOT finished merely because:

"The frontend looks good."

It is finished only when the major required workflows function end-to-end.

For example:

Member registers

→ Gym Admin receives pending member

→ Admin approves member

→ account securely activates

→ membership becomes active

→ member logs in

→ dashboard shows real membership

→ attendance can be recorded

→ trainer can assign workout

→ member sees workout

→ member can book PT

→ trainer sees booking

→ payment can be recorded/verified

→ member sees payment

→ receipt can be downloaded

→ membership expires/renews correctly.

Likewise:

Gym Owner registers

→ gym remains pending

→ Super Admin reviews gym

→ Super Admin approves gym

→ owner gains correct Gym Admin access

→ owner manages only authorized gym data.

These workflows must be genuinely connected across:

Frontend

→ API

→ Authorization

→ Business Logic

→ Database

→ Response

→ Updated UI.

---

# 66. FINAL UI QUALITY STANDARD

The final product should feel like a polished commercial SaaS application rather than:

- a college project
- a generic admin template
- an AI-generated landing page
- a collection of disconnected pages

Maintain visual consistency.

Prioritize usability.

Use premium styling without sacrificing clarity.

---

# 67. FINAL SECURITY STANDARD

Never trade security for convenience.

Especially protect:

authentication

passwords

tokens

payments

financial records

cross-gym data

member personal information

administrative APIs.

Every sensitive operation must be authenticated and authorized server-side.

---

# 68. WORKING BEHAVIOR FOR THIS TASK

Do not stop after generating an audit report if you have repository-editing capabilities.

After auditing:

1. Create your internal implementation plan.
2. Begin implementing the highest-priority issues.
3. Work systematically through dependencies.
4. Test after meaningful changes.
5. Fix regressions before moving forward.
6. Continue through the implementation phases.
7. Update documentation last.

Do not repeatedly ask for confirmation for ordinary engineering decisions.

Make reasonable professional decisions based on the existing architecture.

Ask for user input ONLY when something genuinely requires business information, credentials, external service configuration, or an irreversible product decision.

Examples:

- production payment credentials
- production email credentials
- domain information
- legal text
- pricing decisions

Otherwise proceed autonomously.

---

# 69. IMPORTANT REPOSITORY SAFETY

Before deleting anything, verify that it is unused.

Do not delete working pages because they do not match your new design.

Do not reset the database unnecessarily.

Do not destroy existing migrations.

Do not remove existing API functionality without checking frontend/mobile dependencies.

Do not expose secrets.

Do not commit generated production secrets.

Do not perform destructive database migrations without a safe migration strategy.

---

# 70. FINAL OUTPUT AFTER COMPLETION

At the end provide a concise engineering summary containing:

## Completed

What was implemented.

## Fixed

Existing bugs/security issues corrected.

## Database Changes

Models/migrations/indexes changed.

## API Changes

Endpoints added or modified.

## Frontend Changes

Pages/components/workflows completed.

## Security

Security improvements implemented.

## Testing

Tests/checks performed and their results.

## Remaining

Anything genuinely requiring external credentials or business decisions.

## Production Checklist

What must be configured before deployment.

Do not claim something was completed if it was not actually implemented or tested.

---

# FINAL COMMAND

Now inspect the complete existing VajraFitness repository before making major changes.

Treat the existing codebase as the source of truth.

Preserve all working functionality.

Identify what already exists before creating anything new.

Prioritize FUNCTIONALITY → SECURITY → DATA INTEGRITY → UX → VISUAL POLISH.

Complete missing frontend and backend workflows rather than hiding them behind mock data.

Keep the architecture clean, scalable and maintainable.

Do not over-engineer.

Do not unnecessarily rebuild working code.

Do not leave placeholder implementations for core features.

Build VajraFitness into a secure, responsive, polished, production-ready full-stack multi-gym SaaS management platform.
