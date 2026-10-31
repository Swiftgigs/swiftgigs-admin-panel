# Swiftgigs Admin Panel

Operations console for the Swiftgigs platform. Next.js 16 (App Router) + Tailwind v4, themed to match `swiftgigs-landing-page` (brand `#8657a2`, Geist + Bricolage Grotesque). It talks to `swiftgigs-backend` only; there is no database here.

## Modules

| Page | What it does | Backend |
| --- | --- | --- |
| Overview | Platform health, escrow, activity, "needs attention" queue | `GET /admin/stats` |
| Verification issues | Failed / in-review / step-up providers and failed clients, search + filter, **CSV export**, approve/reject review cases, allow a failed user to retry, risk-held jobs | `GET /admin/verifications` (`?format=csv`), `POST /admin/provider-verifications/:phone/decision`, `POST /admin/verifications/:kind/:phone/reset`, `/admin/jobs/risk-review`, `/admin/jobs/:id/risk-decision` |
| Users | Providers and clients, strikes, availability, safety flags, NIN-hash bans | `/admin/providers`, `/admin/clients`, `/admin/users/:kind/:id/ban` |
| Jobs | All jobs with escrow and risk state | `GET /admin/jobs` |
| Customer care | Agent CRUD + stats, dispute queue with evidence, reassignment | `/customer-care`, `/admin/disputes`, `/admin/disputes/:id/assign` |
| Services | Catalogue CRUD grouped by category, seed defaults | `/services` (+ `PATCH`/`DELETE /services/:slug`) |
| Blog | Markdown editor with preview, drafts / scheduling / archive, SEO fields | `/admin/blog`, public `GET /blog/posts[/:slug]` |
| Fees | Commission rate, cap and start date with live payout preview | `GET`/`PUT /admin/fees` (PUT is super-admin only) |
| Admin team | Create / disable / re-role / reset password (super admin only) | `/admin/admins` |

## Run it

```bash
cp .env.example .env.local   # point BACKEND_API_URL at swiftgigs-backend
bun install
bun dev                      # http://localhost:3000, so run the backend on another port (e.g. PORT=4000)
```

First visit shows a one-time **Set up** form that creates the first super admin (`POST /admin/bootstrap`; needs `ADMIN_SETUP_KEY` if the backend sets one). After that it is a normal sign-in.

## How auth works

The browser never sees the JWT. `/api/auth/login` exchanges credentials with the backend and stores the token in an httpOnly cookie. All data calls go through `/api/backend/*`, a same-origin gateway that attaches the cookie as a `Bearer` token and only forwards `admin`, `services` and `customer-care` routes. `proxy.ts` is just an optimistic redirect to `/login`; the backend enforces real authorization on every call (including the super-admin-only routes).

## Landing page blog integration

Published posts are served unauthenticated from the backend:

- `GET /api/v1/blog/posts?category=&page=&limit=` → `{ data[], total, page, limit, categories[] }`
- `GET /api/v1/blog/posts/:slug` → `{ data }` including Markdown `content`

Fields: `title, slug, excerpt, content (Markdown), category, tags, cover_image_url, author_name, read_time_minutes, seo_title, seo_description, published_at`. Drafts, archived posts and future-dated posts are never returned. Responses send `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
