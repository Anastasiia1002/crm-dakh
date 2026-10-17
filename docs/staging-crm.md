# Staging CRM startup

Use a **staging Nest API origin only**. Do not point the CRM at production.

## 1. Configure staging API origin

```bash
cp .env.staging.example .env.staging
```

Edit `.env.staging` and replace `https://YOUR_STAGING_API_ORIGIN` with the real staging API base URL
(scheme + host, optional port, **no trailing slash**).

`.env.staging` is gitignored. Keep production and local values in separate files:

| File | Vite mode | Script |
|---|---|---|
| `.env` / `.env.development` | `development` | `npm run dev` |
| `.env.staging` | `staging` | `npm run dev:staging` |
| (production build env) | `production` | `npm run build` |

## 2. Start CRM against staging

```bash
npm run dev:staging
```

The browser app will call `${VITE_API_BASE_URL}/api/...` (auth, bookings, calendar, etc.).

Optional production-like preview of a staging build:

```bash
npm run build:staging
npm run preview:staging
```

## 3. Before authenticated QA

1. Confirm the API origin is the designated staging backend (not production).
2. Confirm staging database isolation.
3. Use disposable staging admin credentials only.
4. Do not run booking mutations until those checks pass.

## Auth client behavior (unchanged)

- Login: `POST /api/auth/login` → access token in memory, refresh token in storage.
- Authenticated requests send `Authorization: Bearer <accessToken>`.
- On `401`, client attempts `POST /api/auth/refresh` once, then retries the request.
- Failed refresh clears local session.

For production separation, deploy prerequisites, and release checklist see [release-readiness.md](./release-readiness.md).
