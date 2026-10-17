# crm-dakh

DAKH hotel admin CRM (Vite + React SPA).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development (`.env`) |
| `npm run dev:staging` | CRM against staging API (`.env.staging`) |
| `npm run build` | Production build (requires non-localhost `VITE_API_BASE_URL`) |
| `npm run build:staging` | Staging-mode build |
| `npm run test:verify` | Offline verify scripts (env, auth refresh, bookings, calendar) |

See [docs/staging-crm.md](docs/staging-crm.md) and [docs/release-readiness.md](docs/release-readiness.md).

## Hosting

Static deploy target: **GitHub Pages** (`https://anastasiia1002.github.io/crm-dakh/`).  
API: Nest origin via `VITE_API_BASE_URL` (never embed DB/JWT secrets in the frontend).
