# Solar Business Platform — Backend API

Production-ready REST API for a solar business platform. Built with Express 5, TypeScript, MongoDB (Mongoose), and Cloudinary. Handles product catalogue, articles, lead management, media, analytics, and admin authentication.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Authentication & Security](#authentication--security)
- [API Reference](#api-reference)
- [Middleware](#middleware)
- [Testing](#testing)
- [Production Notes](#production-notes)

---

## Tech Stack

| Layer | Package | Version |
|---|---|---|
| Runtime | Node.js | ≥ 20 |
| Framework | Express | 5.x |
| Language | TypeScript | 7.x |
| Database | MongoDB via Mongoose | 9.x |
| Auth | JWT (access + refresh tokens) | jsonwebtoken 9.x |
| File uploads | Multer + Cloudinary | multer 2.x, cloudinary 2.x |
| Security | Helmet, express-rate-limit, sanitize-html | — |
| Logging | Morgan | 1.x |
| Email | Nodemailer | 6.x |
| Password hashing | bcryptjs | 3.x |
| Testing | Vitest + Supertest + mongodb-memory-server | — |

---

## Project Structure

```
backend/
├── src/
│   ├── config/             # DB, Cloudinary, Multer configs
│   ├── controllers/        # Route handler logic
│   ├── middleware/
│   │   ├── auth.middleware.ts          # JWT Bearer token verification
│   │   ├── csrf.middleware.ts          # Double-submit cookie CSRF protection
│   │   ├── error.middleware.ts         # Centralised error + 404 handlers
│   │   └── userRateLimit.middleware.ts # Per-admin-ID write rate limiter
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routers
│   ├── services/           # Business logic (auth service, etc.)
│   └── utils/
│       ├── jwt.ts
│       ├── password.ts
│       ├── sanitizeHtml.ts             # Rich-text sanitization utility
│       ├── uploadToCloudinary.ts
│       └── ...
│   └── index.ts            # App entry point
├── tests/                  # Vitest integration tests
├── postman/                # Postman collection + environment
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Start development server (hot reload)
npm run dev

# 4. Build for production
npm run build

# 5. Start production server
npm start
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in every value before starting.

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `5000`) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `JWT_ACCESS_SECRET` | Yes | 64-char random hex for signing access tokens |
| `JWT_ACCESS_EXPIRES_IN` | Yes | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_SECRET` | Yes | 64-char random hex for signing refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | Yes | Refresh token TTL (e.g. `7d`) |
| `JWT_RESET_SECRET` | Yes | 64-char random hex for password reset tokens |
| `JWT_RESET_EXPIRES_IN` | Yes | Reset token TTL (e.g. `15m`) |
| `ADMIN_REGISTRATION_KEY` | Yes | Secret header value required to register a new admin |
| `ALLOWED_ORIGINS` | Yes (production) | Comma-separated allowed CORS origins — **required in production or the server will refuse to start** |
| `NODE_ENV` | No | `development` / `production` / `test` |

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Hot-reload dev server via `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled `dist/index.js` |
| `npm test` | Run all tests once (verbose) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |

---

## Authentication & Security

### Token Strategy

- **Access token** — short-lived JWT (default 15 min), sent as `Authorization: Bearer <token>`.
- **Refresh token** — long-lived JWT (default 7 days), stored in an `HttpOnly; SameSite=Strict` cookie scoped to `/api/auth`. Token rotation on every refresh. All tokens stored in DB for revocation.

### CSRF Protection (double-submit cookie)

Cookie-based routes (`/refresh`, `/logout`) require a matching CSRF token:

1. On successful login the server sets a JS-readable `csrf-token` cookie alongside the HttpOnly refresh cookie.
2. The client must echo that value back in an `x-csrf-token` request header on every subsequent `/refresh` and `/logout` call.
3. A cross-origin attacker cannot read the cookie, so the check blocks CSRF requests.

> CSRF validation is **skipped** in `development` and `test` environments.

### Other Security Measures

- **Helmet** — sets secure HTTP headers.
- **CORS** — explicit origin allowlist via `ALLOWED_ORIGINS`. Null origins are blocked in production. Missing `ALLOWED_ORIGINS` in production causes the server to exit at startup.
- **Global rate limit** — 300 requests / 15 min per IP across all routes.
- **Per-admin write rate limit** — 100 write operations / 15 min, keyed by `admin.id`, applied to all `POST/PUT/PATCH/DELETE` routes for products, articles, and leads.
- **Route-specific rate limits** — tighter limits on login (10/15 min), forgot-password (5/hr), registration (3/hr), and public lead submission.
- **Body size limits** — `express.json` and `express.urlencoded` both capped at 10 MB.
- **HTML sanitization** — `sanitize-html` strips dangerous markup from all rich-text fields (article body fields, product detailed description) before DB writes.
- **Password hashing** — bcryptjs with salt rounds ≥ 10.
- **Admin registration** — gated by `X-Registration-Key` header; role is never accepted from the request body.

### Request Logging

Morgan middleware logs every request:
- `combined` format in production (Apache-compatible, includes IP and user-agent)
- `dev` format in development (colour-coded, compact)

---

## API Reference

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <accessToken>`.

### Health Check

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Returns `200` when the server is up |

---

### Authentication — `/api/auth`

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/register` | `X-Registration-Key` header | 3/hr | Create first admin account |
| POST | `/login` | — | 10/15 min | Login; sets HttpOnly refresh cookie + CSRF cookie |
| POST | `/refresh` | CSRF header | — | Rotate refresh token, return new access token |
| POST | `/logout` | CSRF header | — | Revoke refresh token, clear cookie |
| POST | `/forgot-password` | — | 5/hr | Send password reset link (email) |
| POST | `/reset-password` | — | — | Reset password with token from email |
| GET | `/me` | Bearer | — | Get current admin profile |
| POST | `/change-password` | Bearer | — | Change password (revokes all sessions) |

---

### Product Categories — `/api/categories`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List all categories (paginated) |
| GET | `/:identifier` | — | Get by ID or slug |
| POST | `/` | Bearer | Create category (image upload) |
| PUT | `/:id` | Bearer | Update category |
| DELETE | `/:id` | Bearer | Soft-delete (deactivate) |
| PATCH | `/:id/restore` | Bearer | Restore deactivated category |

---

### Products — `/api/products`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List products with search, filter, sort, pagination |
| GET | `/slug/:slug` | — | Get product by slug |
| GET | `/id/:id` | — | Get product by ID (increments view count) |
| GET | `/:id/related` | — | Get up to 6 related products (same category) |
| POST | `/:id/enquiry` | — | Submit product enquiry |
| POST | `/:id/view` | — | Explicit view tracking for SPAs |
| POST | `/` | Bearer + write limiter | Create product (up to 10 images) |
| PUT | `/:id` | Bearer + write limiter | Update product |
| DELETE | `/:id` | Bearer + write limiter | Soft-delete (deactivate) |
| PATCH | `/:id/featured` | Bearer + write limiter | Toggle featured status |
| PATCH | `/:id/stock` | Bearer + write limiter | Update stock count |
| PATCH | `/:id/restore` | Bearer + write limiter | Restore deactivated product |

**Query params for `GET /`:** `search`, `category`, `isAvailable`, `stockStatus`, `isFeatured`, `minPrice`, `maxPrice`, `sort` (`newest`/`oldest`/`price_asc`/`price_desc`/`featured`/`views`), `page`, `limit`

---

### Services — `/api/services`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List all services |
| GET | `/slug/:slug` | — | Get service by slug |
| GET | `/id/:id` | — | Get service by ID |
| POST | `/` | Bearer | Create service (image upload) |
| PUT | `/:id` | Bearer | Update service |
| DELETE | `/:id` | Bearer | Delete service |
| PATCH | `/:id/status` | Bearer | Toggle active status |

---

### Video Categories — `/api/video-categories`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List all video categories |
| GET | `/slug/:slug` | — | Get by slug |
| GET | `/id/:id` | — | Get by ID |
| POST | `/` | Bearer | Create category |
| PUT | `/:id` | Bearer | Update category |
| DELETE | `/:id` | Bearer | Delete category |
| PATCH | `/:id/status` | Bearer | Toggle active status |

---

### Videos — `/api/videos`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List videos (filter, sort, paginate) |
| GET | `/youtube/:youtubeId` | — | Get by YouTube video ID |
| GET | `/id/:id` | — | Get by DB ID |
| POST | `/` | Bearer | Create video (YouTube URL based) |
| PUT | `/:id` | Bearer | Update video |
| DELETE | `/:id` | Bearer | Delete video |
| PATCH | `/:id/visibility` | Bearer | Toggle visibility |
| PATCH | `/:id/featured` | Bearer | Toggle featured status |

---

### Article Categories — `/api/article-categories`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List all article categories |
| GET | `/slug/:slug` | — | Get by slug |
| GET | `/id/:id` | — | Get by ID |
| POST | `/` | Bearer | Create category |
| PUT | `/:id` | Bearer | Update category |
| DELETE | `/:id` | Bearer | Delete category |
| PATCH | `/:id/status` | Bearer | Toggle active status |

---

### Articles — `/api/articles`

Rich-text fields (`description`, `technicalExplanation`, `troubleshootingSteps`, `safetyInformation`) are HTML-sanitized on every write.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List articles with search, filter, sort, pagination |
| GET | `/slug/:slug` | — | Get article by slug |
| GET | `/id/:id` | — | Get article by ID (increments view count) |
| POST | `/` | Bearer + write limiter | Create article (featured image upload) |
| PUT | `/:id` | Bearer + write limiter | Update article |
| DELETE | `/:id` | Bearer + write limiter | Unpublish (soft delete) |
| PATCH | `/:id/publish` | Bearer + write limiter | Publish article |
| PATCH | `/:id/unpublish` | Bearer + write limiter | Unpublish article |

**Query params for `GET /`:** `search`, `category`, `status` (`draft`/`published`/`unpublished`), `sort` (`newest`/`oldest`/`published`), `page`, `limit`

---

### FAQs — `/api/faqs`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List all FAQs |
| GET | `/active` | — | List only active FAQs |
| GET | `/:id` | — | Get FAQ by ID |
| POST | `/` | Bearer | Create FAQ |
| PUT | `/:id` | Bearer | Update FAQ |
| DELETE | `/:id` | Bearer | Soft-delete FAQ |
| PATCH | `/:id/status` | Bearer | Toggle active status |
| PATCH | `/reorder` | Bearer | Bulk reorder FAQs |

---

### Testimonials — `/api/testimonials`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List approved & visible testimonials |
| POST | `/` | — | Submit testimonial (defaults to pending) |
| GET | `/admin` | Bearer | List all testimonials (admin view) |
| GET | `/:id` | Bearer | Get testimonial by ID |
| PUT | `/:id` | Bearer | Update testimonial |
| PATCH | `/:id/approve` | Bearer | Approve testimonial |
| PATCH | `/:id/visibility` | Bearer | Toggle visibility |
| DELETE | `/:id` | Bearer | Delete testimonial |

---

### Leads — `/api/leads`

Covers contact enquiries, product enquiries, installation requests, site visits, support requests, and video call requests.

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/` | — | Public limiter | Submit a lead (any type) |
| GET | `/` | Bearer | — | List all leads (paginated, filterable) |
| GET | `/:id` | Bearer | — | Get lead by ID |
| PUT | `/:id` | Bearer + write limiter | — | Update lead status / notes |
| DELETE | `/:id` | Bearer + write limiter | — | Delete lead |

---

### Notifications — `/api/notifications`

All routes are admin-only.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Bearer | List notifications (paginated) |
| GET | `/unread-count` | Bearer | Get unread notification count |
| PUT | `/:id/read` | Bearer | Mark a notification as read |
| PUT | `/read-all` | Bearer | Mark all notifications as read |
| DELETE | `/:id` | Bearer | Delete a notification |

---

### Website Settings — `/api/settings`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Get public site settings |
| GET | `/admin` | Bearer | Get full settings (including private fields) |
| PUT | `/` | Bearer | Update settings (logo + favicon upload, max 2 MB each) |

---

### Media Library — `/api/media`

All routes are admin-only. Upload limit: 50 MB.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/upload` | Bearer | Upload a file to Cloudinary |
| GET | `/` | Bearer | List all media assets |
| DELETE | `/:id` | Bearer | Delete media asset from Cloudinary + DB |

---

### Dashboard — `/api/dashboard`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Bearer | Get dashboard stats (leads, products, articles, etc.) |

---

### Analytics — `/api/analytics`

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/events` | — | Public limiter | Track an analytics event |
| GET | `/` | Bearer | — | Get aggregated analytics summary |

Supported event types: `product_view`, `product_enquiry`, `whatsapp_click`, `page_view`, and more.

---

### Search — `/api/search`

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/` | — | 20/min (prod) | Global search across products, articles, services, FAQs |

**Query params:** `q` (required, min 2 chars), `page`, `limit`

---

## Middleware

| File | Purpose |
|---|---|
| `auth.middleware.ts` | Verifies Bearer JWT, checks admin is still active, attaches `req.admin` |
| `csrf.middleware.ts` | Double-submit cookie CSRF for `/refresh` and `/logout` |
| `error.middleware.ts` | Centralised error handler (leaks stack trace only in dev); 404 handler |
| `userRateLimit.middleware.ts` | Per-admin-ID rate limiter (100 writes / 15 min) on product, article, and lead write routes |

---

## Testing

Tests use **Vitest** + **Supertest** against an in-memory MongoDB instance (no external services needed). Cloudinary is mocked.

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Test files live in `tests/`. Each file covers one resource area (auth, category, product, lead, faq, testimonial, misc). The shared `tests/helpers.ts` builds a full Express app for tests without calling `app.listen()`.

---

## Production Notes

1. **`ALLOWED_ORIGINS` is mandatory in production.** The server calls `process.exit(1)` on startup if it is missing or empty.
2. **Set `NODE_ENV=production`** — this enables stricter CORS, disables dev-only token exposure in `forgotPassword`, activates combined Morgan logging, and tightens per-route rate limits.
3. **CSRF cookies** require `secure: true` in production (enforced automatically when `NODE_ENV=production`).
4. **Refresh token rotation** — every `/refresh` call issues a new refresh token and invalidates the old one. Clients must always store the latest token from the `Set-Cookie` header.
5. **Soft deletes** — products, articles, and categories are deactivated rather than hard-deleted to preserve referential integrity and analytics history.
6. **Rich-text sanitization** — all HTML content in article and product fields is sanitized through `sanitize-html` before being persisted, preventing stored XSS.
