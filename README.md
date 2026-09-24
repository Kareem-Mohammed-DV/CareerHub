# CareerHub — Next Generation Career Platform

A full-stack, production-oriented hiring platform: job seekers discover opportunities and manage applications, companies publish roles and run their hiring pipeline, and admins govern the whole platform. Built by **Kareem Mohamed Bakr**.

## Feature map

| Area | What's included |
|---|---|
| **Auth & security** | JWT access/refresh (rotating, hashed), bcrypt(12), role guards (JOB_SEEKER/COMPANY/ADMIN), rate-limited auth, Helmet, Zod validation everywhere, UUID→404 handling |
| **Job seeker** | Dashboard, profile with strength meter, **CV upload/download/replace/delete** (PDF/DOC/DOCX, magic-byte validated, 5 MB), applications with status timeline, saved jobs, **job alerts** (instant/daily/weekly notifications + email), messages, notifications |
| **Company** | Dashboard with live stats, job CRUD with **plan limits**, applicant pipeline (status + history), **featured jobs** (Growth/Scale), analytics (views/convertion/sources/timeline), billing (plan, usage bar, payment history), company profile |
| **Admin** | Platform overview with revenue, users/companies/jobs/applications management, **company approval workflow (PENDING→VERIFIED/REJECTED)**, payments ledger, subscriptions + **MRR**, **audit logs**, **CSV export** for users/companies/jobs/applications |
| **Billing** | Free/Growth/Scale plans, Paymob checkout + HMAC-verified webhook (or sandbox mode without credentials), invoices, cancellation at period end, **billing emails** (confirmation, started, failed, renewal reminder T-3d) |
| **Emails** | Welcome, new application, status change, billing set, job-alert matches — throttled no-op when SMTP is unset |
| **Platform** | PWA manifest, SEO metadata + OG/Twitter, favicon/logo, footer credits, per-page titles, responsive from mobile to desktop |

## Requirements

- Docker Desktop (Windows/macOS) or Docker Engine + Compose v2 (Linux)
- Node.js 20+ only if you want to run the apps outside Docker

## Quick start (development)

```bash
cp .env.example .env        # then edit: replace every secret
docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:4000/health
- Swagger docs: http://localhost:4000/docs

The dev compose applies migrations automatically on API start (`prisma migrate deploy` in prod; `db push`-equivalent sync handled by the entrypoint during local dev).

## Environment variables

See `.env.example` (dev) and `.env.production.example` (prod, with required-variable enforcement). Never commit `.env`. Key groups:

- `POSTGRES_*`, `DATABASE_URL` — database
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — 32+ random chars each
- `SMTP_*`, `MAIL_FROM` — email (empty host = emails disabled safely)
- `PAYMOB_*` — payments (empty = sandbox/dev activation mode)
- `WEB_ORIGIN`, `WEB_URL` — CORS and email links
- `UPLOAD_DIR` — where CVs are stored (default `backend/uploads/resumes`)

## Production deployment

```bash
cp .env.production.example .env   # fill DOMAIN, ACME_EMAIL, POSTGRES_*, JWT secrets
./scripts/deploy.sh               # build + migrate + up + health check
```

- `docker-compose.prod.yml` runs Postgres **without exposed ports**, Caddy terminates **HTTPS automatically** (Let's Encrypt) and routes `/` → web, `/api/*` + `/docs` → API.
- Cron for backups: `0 3 * * * cd /opt/careerhub && ./scripts/backup-all.sh >> ./backups/backup.log 2>&1` (database + CV files)
- Restore: `./scripts/restore-db.sh backups/<dump>.sql.gz`

## Database

PostgreSQL 16 + Prisma. Migrations are the source of truth:

```bash
cd backend
npx prisma migrate deploy        # apply committed migrations (prod-safe)
npx prisma migrate dev --name x  # create a new migration during development
```

Backup strategy: nightly `pg_dump` + CV tarball via `scripts/backup-all.sh` (compressed, auto-pruned after `BACKUP_KEEP_DAYS`), optional off-site copy with `BACKUP_RCLONE_TARGET`. Volumes `postgres_data` and `resumes_data` persist data across restarts. Verify anytime with `./scripts/health-check.sh`.

## Testing

```bash
cd backend  && npx tsc --noEmit   # API typecheck
cd frontend && npx tsc --noEmit   # web typecheck
cd frontend && npm run build      # production web build
```

Core flows are verified end-to-end: register/login, job publish → alert notification, apply → company email, status change → candidate email, plan limits (402), Paymob webhook HMAC accept/reject, CV upload/download authorization, admin CSV exports, audit logging.

## Project structure

```
CareerHub/
├── backend/            Express + TypeScript + Prisma API
│   ├── prisma/         schema.prisma + migrations/
│   └── src/
│       ├── common/     auth middleware, errors, mailer, audit
│       ├── config/     zod-validated env
│       └── modules/    auth, jobs, applications, profiles, companies,
│                       notifications, messages, admin, billing, alerts
├── frontend/           React + Vite SPA (design system in styles.css)
├── docs/               GUIDE.md (full walkthrough), sitemap.html
├── scripts/            deploy.sh, backup-all.sh, backup-db.sh, restore-db.sh, restore-resumes.sh, health-check.sh
├── docker-compose.yml       development
└── docker-compose.prod.yml  production (HTTPS via Caddy)
```

## Pushing to GitHub

The repo ignores all secrets (`.env*` except the two templates), uploads, backups, `node_modules` and build artifacts. Verify what would be committed with `git status` — no `.env`, no `uploads/`, no `backups/` should ever appear.

```bash
cd CareerHub
git init -b main
git add .
git commit -m "CareerHub — full-stack career platform"
# then create the repo on GitHub and:
git remote add origin git@github.com:<you>/careerhub.git
git push -u origin main
```

On the VPS, deploy by cloning the repo, copying `.env.production.example` to `.env`, filling real values, and running `./scripts/deploy.sh`.

## Credits

CareerHub — crafted by **Kareem Mohamed Bakr**.
