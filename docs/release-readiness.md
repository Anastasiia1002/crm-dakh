# DAKH CRM — Production release readiness

This document prepares a **safe future production deployment** of the CRM SPA.
It is **not** authorization to deploy, change DNS, Render, Supabase, or production CORS.

## Architecture overview

| Piece | Reality |
|---|---|
| App type | Vite + React SPA (TanStack Query, React Router) |
| Intended hosting | **GitHub Pages** (`https://anastasiia1002.github.io/crm-dakh/`) via `.github/workflows/deploy.yml` |
| Asset base path | `/crm-dakh/` when `GITHUB_PAGES=true` |
| SPA fallback | `dist/404.html` copied from `index.html` in CI |
| API | Nest backend origin only (browser calls `${VITE_API_BASE_URL}/api/...`) |
| Known production API | `https://dakh-backend.onrender.com` (configure explicitly; never hardcode secrets) |
| Staging API (local) | `http://localhost:3000` via backend `start-staging-crm.ts` + staging Supabase `qeiduiuoumdqrtfcgqgx` |
| Production DB | Supabase `bqlrkyyfdvlrwdidzvah` — CRM never connects to Supabase directly |

The CRM is a static frontend. It must not bundle database URLs, JWT signing secrets, or admin passwords.

## Required environment variables

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | Yes (all modes) | Absolute API **origin** only (scheme + host [+ port]). No `/api` path, no credentials. |
| `GITHUB_PAGES` | CI only | Set to `true` in GitHub Pages build to use base `/crm-dakh/`. |

Example files (placeholders only, committed):

- `.env.example` — local development
- `.env.staging.example` — staging mode
- `.env.production.example` — production build documentation

Private local files (gitignored): `.env`, `.env.staging`, `.env.production`, `.env.*`

### Validation rules (`src/lib/api-env.ts` + `vite.config.ts`)

- Missing / empty URL → **build/dev fails**
- Production mode → **https required**, localhost **rejected**
- Staging/development → localhost allowed for local staging Nest
- Username/password in URL → rejected
- Path/query/hash → rejected

## Staging vs production separation

| Concern | Staging | Production |
|---|---|---|
| Vite mode | `staging` (`npm run dev:staging` / `build:staging`) | `production` (`npm run build`) |
| API origin | Local staging Nest (`http://localhost:3000`) or future staging host | Deploy variable (e.g. Render Nest https origin) |
| Database | Staging Supabase only | Production Supabase (backend only) |
| Email | Backend `EMAIL_PROVIDER=memory` in staging launcher | Production email provider (backend) |
| Public booking | Disabled on staging launcher | Backend-controlled; CRM must not enable it |
| QA data | Disposable `DAKH_STAGING_QA_*` bookings OK | Never seed staging QA into production |

Checklist:

- [x] Staging scripts use Vite `--mode staging`
- [x] Production builds fail on localhost API URL
- [x] Private env files gitignored
- [x] Example env files have no secrets
- [ ] GitHub Actions repository variable `VITE_API_BASE_URL` set for Pages deploys
- [ ] Production Nest CORS allows the GitHub Pages origin
- [ ] Business sign-off for go-live

## Authentication and session behavior

- Login: `POST /api/auth/login` → access token **memory only**, refresh token in `localStorage`
- Authenticated calls: `Authorization: Bearer <accessToken>`
- On HTTP 401: single shared `POST /api/auth/refresh`, then **one** retry (`retry: false` prevents loops)
- Concurrent 401s share one in-flight refresh
- Refresh failure / logout: clear memory + storage + React Query cache → protected routes redirect to `/login`
- Inactive admins rejected client-side if a profile with `active: false` is returned
- Hotel scoping is enforced by the backend; CRM lists only the authenticated hotel’s inventory

Automated coverage: `src/lib/api-client.verify.ts` (refresh success/failure, concurrent 401, logout clear, restore path).

## Booking workflow dependencies

- Admin booking APIs: list/detail/create/patch/quote/status actions/guests
- Create UI currently sends `source: ADMIN`, `status: CONFIRMED` (business rule — do not change without approval)
- Quote required before create button enables; submit lock prevents double-submit
- Calendar uses availability API; mutations invalidate booking + calendar queries
- Money displayed from server fields in UAH (`formatAdminBookingMoney`)
- Destructive status actions use confirmation dialogs

## Deployment prerequisites

### Code / CI

- [x] Reproducible build: `npm ci && npm run build`
- [x] GitHub Pages workflow requires `vars.VITE_API_BASE_URL`
- [x] SPA `404.html` fallback for client routes
- [ ] Repository variable `VITE_API_BASE_URL` configured (https Nest origin)
- [ ] Confirm Pages site URL and that staff can reach it

### Backend / infrastructure (outside this repo)

- [ ] Nest production CORS includes `https://anastasiia1002.github.io` (and custom CRM domain if added later)
- [ ] Production API healthy over HTTPS
- [ ] Production admin accounts provisioned (not staging disposable accounts)
- [ ] No CRM deploy step mutates Supabase schema

### Business

- [ ] Confirm ADMIN create-as-CONFIRMED is intended for production
- [ ] Staff training / runbook for status transitions
- [ ] Decision: keep GitHub Pages vs move to another static host (Cloudflare Pages, S3+CloudFront, etc.) — both are supported patterns for this SPA

## Production smoke tests (after a future authorized deploy)

Run only with production credentials and change control. Prefer read-only first.

1. Open CRM Pages URL over HTTPS; login page loads.
2. Login as a production ADMIN (per hotel).
3. `/api/auth/me` equivalent: profile loads; role ADMIN; hotel-scoped.
4. Booking list loads (no staging QA guest names).
5. Calendar loads for the current window.
6. Open create form; inventory is hotel-scoped; quote returns UAH amounts.
7. **Do not** create bookings unless mutation QA is explicitly approved.
8. Logout clears session; back-button does not show cached admin data for a new visitor context.
9. Hard-refresh on `/admin/bookings/:id` deep link works (SPA fallback).

## Rollback procedure

GitHub Pages:

1. Re-run a previous successful deploy workflow / restore prior Pages artifact if available.
2. Or revert the git commit on `main` and let CI redeploy the last known-good static build.
3. If the fault is API/CORS, roll back or fix the Nest config — the static CRM cannot “roll forward” past a wrong `VITE_API_BASE_URL` without a rebuild.

Keep the previous `VITE_API_BASE_URL` value recorded in ops notes (not in git secrets files).

## Known limitations

- Guests / services / promo-codes / dashboard still use mock or partial APIs in places; booking/calendar/rates/accommodations/settings/users are the production-critical integrated surfaces.
- Token expiry was unit-tested in the client; full browser idle-timeout QA against live JWT TTLs remains a go-live smoke item.
- CRM UI does not offer PENDING create; PENDING is API-capable if product later requires it.
- GitHub Pages is public static hosting — do not place secrets in the repo or in client bundles.

## Unresolved decisions

- [ ] Final production CRM hostname (stay on `*.github.io` vs custom domain)
- [ ] Exact production Nest CORS origin list once CRM hostname is final
- [ ] Whether staging should also have a hosted URL (today: local Nest + local Vite)

## Release checklist

### Code readiness

- [x] Env separation + fail-fast API URL validation
- [x] Auth refresh / logout / concurrent 401 automated checks
- [x] Booking lifecycle staging QA completed (prior task)
- [x] `npm run test:verify` green
- [x] `npm run build` / `build:production` green when `VITE_API_BASE_URL` is an https Nest origin (bare local `npm run build` correctly **fails** if `.env` still points at localhost)
- [x] `npm run build:staging` green for local staging origin
- [ ] PR review + approved commit of release-readiness changes

### Infrastructure readiness

- [ ] `VITE_API_BASE_URL` GitHub Actions variable set
- [ ] Production CORS allows CRM origin
- [ ] HTTPS verified end-to-end
- [ ] Deploy workflow dry-run reviewed

### Business readiness

- [ ] Go-live window approved
- [ ] Production admin access confirmed
- [ ] Support / rollback owner named
