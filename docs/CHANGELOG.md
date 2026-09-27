# Changelog

All notable changes to CareerHub are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] — 2026-09-28

### Navigation & Routing Audit

CareerHub now behaves like a production website: every page is reachable
through the UI — no manually typed URLs, no broken links, no unintended 404s.

### Added

- **Featured Jobs** at `/jobs/featured` with ★ badges — the existing Jobs page
  renders in featured mode via the real `GET /api/v1/jobs/featured` endpoint,
  with a Featured link in the navbar for visitors, seekers, companies, and admins
- **Companies directory** at `/companies` with open-role counts, backed by a
  public companies listing endpoint; company profiles are now linked from every
  job card and from the navbar and footer

### Changed

- Login returns you to the page you were trying to reach (the access guard
  preserves the intended destination); newly registered users land directly on
  the dashboard for their role
- Role-aware navigation is complete: seekers get Jobs · Dashboard ·
  Applications · Saved jobs · Alerts · Profile; companies get Dashboard · Jobs ·
  Applicants · Analytics · Billing · Company profile; admins get the full
  operations suite including CSV export and audit logs

### Fixed

- `/jobs/featured` no longer shows a 404 (it previously fell through to
  `/jobs/:id` with "featured" as an id)
- Admin CSV exports now download reliably — downloads go through an
  authenticated fetch (Bearer token) instead of a plain `<a href>` that always
  failed with 401
- Decorative hero orbs are clipped inside their layer, eliminating horizontal
  overflow on mobile and tablet

### CI

- New GitHub Actions workflow (`.github/workflows/ci.yml`): backend (pnpm,
  frozen lockfile, Prisma generate + tsc) and frontend (npm ci + tsc + vite
  build) are typechecked and built on every push to `main` and on pull requests
- Removed a malformed tracked `backend/pnpm-workspace.yaml` (placeholder text,
  no `packages` field) that broke local pnpm installs and would have failed CI

### Verified

- TypeScript and production builds clean on both apps; first CI run green
- All three role dashboards, register/login/redirect flows, CSV export, and
  mobile navigation tested in-browser (25/25 smoke-test checks passed)

## [1.0.0] — 2026-09-23

### Added

- Initial production-ready release: job discovery, applications, saved jobs,
  CV management, job alerts, featured jobs, subscriptions (Free/Growth/Scale),
  Paymob payments, notifications, analytics, admin suite with audit logs and
  CSV export
- Docker Compose for development and production (Caddy automatic HTTPS),
  backup/restore and deployment scripts
