# MyCarQR Workspace

## Overview

MyCarQR — "Scan to Reach the Car Owner." A full-stack web app where car owners generate smart QR codes for their vehicles so anyone can contact them during parking issues without exposing personal details.

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (Replit-managed, via proxy)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind v4 + shadcn/ui + Wouter + TanStack Query
- **QR generation**: `qrcode` npm package

## Artifacts

| Artifact | Path | Description |
|---|---|---|
| `artifacts/mycarqr` | `/` | React+Vite frontend (port 18531) |
| `artifacts/api-server` | `/api` | Express API server (port 8080) |

## Key Commands

- `pnpm run typecheck:libs` — build composite libs (db, api-zod, api-client-react)
- `pnpm run typecheck` — full project typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/api-server run build` — build API server

## Lib Packages

| Package | Description |
|---|---|
| `lib/api-spec` | OpenAPI spec + Orval codegen config |
| `lib/api-zod` | Generated Zod schemas from OpenAPI |
| `lib/api-client-react` | Generated React Query hooks from OpenAPI |
| `lib/db` | Drizzle ORM schema + DB connection |

## DB Schema Tables

- `users` — Clerk user ID, email, plan (free/premium), isAdmin, premiumExpiresAt
- `vehicles` — Vehicle info, QR code UUID, privacy settings, safety score
- `scan_alerts` — Alerts sent when someone scans a QR
- `vehicle_documents` — Insurance/pollution/registration expiry reminders
- `sos_profiles` — Owner emergency contact + blood group + medical notes (1 per user)
- `accident_reports` — Accident witness reports submitted via public scan page
- `lost_items` — Found-key/lost-item reports submitted via public scan page
- `payment_settings` — Singleton row: UPI ID, QR image (base64), prices, instructions
- `payment_requests` — User payment submissions: plan, amount, screenshot, status (pending/approved/rejected), adminNote, expiresAt
- `qr_settings` — Singleton row: brandName, tagline, ctaText, enabledThemes (jsonb), premiumThemes (jsonb)
- `sticker_orders` — Physical sticker orders: user details, delivery address, product (basic_vinyl/premium_weatherproof/pack_of_3), amount, **stickerStyle** (midnight-carbon/light-premium/racing-red/electric-blue, nullable), **vehicleNumber** (snapshot copied at order time from the linked vehicle so admin print reflects the original number even if vehicle is renamed/deleted), payment screenshot, paymentStatus (pending/screenshot_uploaded/approved/rejected), orderStatus (pending/printed/shipped/delivered/cancelled), trackingNumber, adminNote

### Sticker template assets

Each of the 4 sticker designs ships in 3 square HD resolutions plus a legacy fallback:

- `public/stickers/{slug}-512.png` — 512×512, used for small thumbnails (e.g. `my-orders` style badge)
- `public/stickers/{slug}-1024.png` — 1024×1024, used in style-picker preview cards (`qr-studio`, `order-sticker`)
- `public/stickers/{slug}-2048.png` — 2048×2048, used as the source template for the 300 DPI 8 cm sticker PDF
- `public/stickers/{slug}.jpg` — legacy 1024×1024 JPEG kept as a back-compat fallback (`templateUrl`)
- `public/stickers/_originals/` — original 1536×1024 WhatsApp uploads preserved as backup
- Slugs: `midnight`, `light`, `red`, `blue` (square-padded with each design's brand bg color)
- All resolution variants are exposed on `STICKER_DESIGNS` in `src/lib/sticker-pdf.ts` as `thumbnailUrl`, `previewUrl`, `printTemplateUrl`. PDF render uses the 2048 PNG; QR is regenerated fresh at 1200×1200 (ECL-H) and downsampled into the 320 px QR pad with `imageSmoothingQuality = "high"` for crisp print output.

## Features

- Landing page with hero, features, pricing, FAQ sections
- Clerk authentication (sign-in/sign-up with OAuth)
- Dashboard with stats, recent alerts, document warnings
- Vehicle management (add, edit, delete, QR toggle)
- QR code generation + download + share
- Public scan page — 3 tabs: Alert Owner | Report Accident | Found Keys
- Emergency Help button on scan page (shows SOS info if owner has enabled it)
- Scan alerts with mark-read/mark-all-read
- **Accident Reports** (`/accident-reports`) — witness reports with photos, location, mark-read
- **Lost Key Returns** (`/lost-items`) — found-key messages with finder contact, photos, mark-read
- **SOS Emergency Profile** (`/sos-profile`) — owner fills in emergency contacts, blood group, medical notes; visible to witnesses via QR scan
- Document reminders with expiry status
- Privacy mode (hides phone from public scan page)
- Safety score per vehicle
- Pricing page
- **Upgrade Premium** (`/payment`) — UPI payment page: shows QR/UPI ID, screenshot upload, submit for admin review, request history
- **Enhanced Admin Panel** (`/admin`) — 10 tabs: Overview stats, Users (with upgrade/downgrade), Vehicles, Payment Requests (approve/reject), Sticker Orders (approve/reject payment, set order status, tracking number), Payment Settings (UPI/QR/prices/instructions), QR Settings, Accidents, Lost Items, Alerts. Access is gated on `users.is_admin = true` OR a static email allowlist (`artifacts/api-server/src/lib/adminEmails.ts` — currently `aakashkaishyap2@gmail.com`, extendable via `ADMIN_EMAILS` env var). When an allowlisted user hits `/me` or any `/admin/*` route, the server auto-promotes their `is_admin` flag in the DB and backfills their email — preventing lock-out if they sign in via a different OAuth method that produces a new Clerk user_id. Email is resolved from Clerk session claims first, falling back to `clerkClient.users.getUser()` (Backend API) so it works without a custom JWT template.
- **Payment Approval Workflow** — admin approves → user upgraded to premium with auto-expiry (30 days monthly / 365 days yearly); expiry auto-checked on GET /me
- Dark/light mode toggle
- **QR Design Studio** (`/vehicles/:id/qr-studio`) — Premium sticker editor with 8 themes. PNG/PDF export, 4 print-ready sticker PDFs with real WhatsApp logo templates (Midnight Carbon, Light Premium, Racing Red, Electric Blue), save designs to localStorage. "Order Print" button links to physical order page. Free=2 themes, Premium=all.
- **Print-Ready Sticker PDFs (Template-based)** — 4 premium sticker designs at 8×8 cm / 300 DPI / ECL-H using uploaded logo templates as background: Midnight Carbon (black + gold), Light Premium (white + gold), Racing Red, Electric Blue. Each PDF: template image fills top 70%, real scannable QR overlays the decorative QR with white quiet-zone pad, bottom 30% has vehicle number + "Scan to Contact Owner" + "मालिक से संपर्क करें" + footer. Cut marks at 4 corners. Templates are bundled at `artifacts/mycarqr/public/stickers/{midnight,light,red,blue}.jpg` and loaded via `import.meta.env.BASE_URL`. If template fails to load, falls back to a plain accent-bordered design. Lib: `artifacts/mycarqr/src/lib/sticker-pdf.ts`.
- **Physical Sticker Orders** (`/order-sticker`) — 4-step flow: product + **sticker style picker** (4 styles with image previews, persisted as `stickerStyle` on the order), delivery address, UPI payment + screenshot upload, confirmation. The chosen style is shown on `/my-orders` and the admin orders panel; admin gets a "Print PDF Sticker" button that downloads the order's PDF in the user's chosen style.
- **My Orders** (`/my-orders`) — Track order status, upload payment screenshots for pending orders, view tracking numbers and admin notes.
- **Vehicle Detail QR** — Upgraded to Error Correction Level H with centered "MQ" logo overlay drawn via Canvas 2D API.

## Pricing

- Free: 1 vehicle, basic QR, 5 alerts/month
- Premium: ₹99/month or ₹599/year — unlimited vehicles, privacy mode, unlimited alerts, document reminders, safety score
- Prices are admin-configurable via Payment Settings tab

## Legal/Trust Pages, Tabbed Profile & Expanded Admin (Apr 2026)

- **Public legal/trust pages**: `/about`, `/contact`, `/privacy`, `/terms`, `/refund`, `/shipping`, `/disclaimer` — markdown content stored in `legal_pages` table (DB-backed), rendered via `react-markdown` (no raw HTML), wrapped in shared `PublicPage` (header + footer). Admins edit content from Admin → Legal tab. **Pages never go blank**: if a slug has no DB row (e.g. fresh production deploy with empty `legal_pages` table) the API serves built-in default content from `artifacts/api-server/src/lib/defaultLegalContent.ts` so users always see real text instead of "couldn't load this page". The list endpoint also merges DB rows with defaults so the admin Legal tab always shows all 6 slugs.
- **Public footer** (`PublicFooter`) replaces landing-page footer; links to all legal pages.
- **App footer** rendered inside `AppLayout`'s scroll area for signed-in pages.
- **Contact form** (`POST /api/contact`) — public form with validation, hidden honeypot field, and per-IP rate limit (5 / 10 min). Messages flow into Admin → Messages with status workflow (new/read/replied/archived) and admin notes.
- **Profile refactored to tabbed Settings hub** at `/profile?tab=...` with 8 tabs: Account (Clerk widget + plan badge), Vehicles, Subscription, Orders, Notifications, Emergency, Help, Settings (incl. **Danger Zone** delete-account that requires confirming the user's email; uses `DELETE /api/me` which wipes all user data inside a single DB transaction, then best-effort deletes the Clerk user).
- **Notifications preferences** stored in `notification_preferences` (5 toggles). Endpoints: `GET/PUT /api/me/notifications`.
- **Help/Support** — Public `faqs` table powers an accordion on the Help tab; users can also create support tickets (`/api/support-tickets` POST, `/api/me/support-tickets` GET) which admins respond to via `adminNote` from Admin → Tickets.
- **Testimonials** stored in `testimonials` and curated by admins.
- **5 new admin tabs**: Messages, Legal, FAQs, Testimonials, Tickets — each has full CRUD using a small shared `useAdminFetch` helper. All admin endpoints are gated by `requireAuth + requireAdmin`.
- **DB schema additions**: `contact_messages`, `legal_pages`, `faqs`, `testimonials`, `support_tickets`, `notification_preferences`. Pushed via `pnpm --filter @workspace/db run db:push`. Default legal/FAQ content seeded.
