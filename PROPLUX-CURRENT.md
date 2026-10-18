# Proplux — Current State (handoff for next chat)

**Date:** 2026-10-05
**Stack:** Next.js 16 (App Router), TypeScript, Tailwind, Prisma + PostgreSQL (Vercel + Neon; local via `vercel env pull`), NextAuth (JWT), uploads on Vercel Blob with local ./uploads fallback, SMTP email (+ Resend fallback), NOWPayments

## Roles
BUYER / SELLER / ADMIN

## What's built and working

### Auth
- Login, register, forgot password (email via SMTP, Resend fallback)
- Ban enforcement (banned users can't log in)
- Role management from admin

### Email (SMTP)
- Admin → Settings → **Email (SMTP)** section: toggle, host, port, encryption (STARTTLS/SSL/None), username, password, from address + name
- Stored in `Setting` table (`smtpEnabled`, `smtpHost`, `smtpPort`, `smtpSecurity`, `smtpUser`, `smtpPass`, `smtpFrom`, `smtpFromName`) — same pattern as NOWPayments keys
- `app/lib/email.ts` sends through SMTP when enabled; falls back to Resend (`RESEND_API_KEY`) when off
- **Send test email** button → `POST /api/admin/email/test` (saves settings first, reports the exact SMTP error on failure)
- Welcome email on registration (fire-and-forget)
- **Withdrawal emails**: payout request → Admin Alert Email; APPROVED / REJECTED / PAID → seller (both in `withdrawals` routes, fire-and-forget, HTML-escaped via `escapeHtml`)
  - Rejection includes a **reason**: admin is prompted for one on Reject (`window.prompt`), stored in `Withdrawal.reason`, shown in the admin table + seller's withdraw page + the rejection email

### Marketplace
- Products with per-category dynamic fields (admin-defined)
- Search + filters + bulk purchase (checkboxes → bulk checkout)
- **Sell-once**: login-type products disappear after purchase
- **Files/Leads**: unlimited sales
- Marketplace hides hidden fields entirely (credentials never sent to buyer browser)

### Product delivery
- 3 delivery types: credentials / text / file
- **Per-field visibility** — admin decides what buyers see before purchase
- Hidden fields omitted from `/api/products` (not shown as ***)
- Buyer sees full credentials only in `/orders` after purchase
- Admin sees everything in `/admin/orders/[id]`

### Field types available
- text, number, textarea, select, country, expiry, image_urls, sample_text

### Card category (complete)
Fields: type, bin, billing_address (Yes/No), billing_street, billing_city, billing_state, billing_zip, country, phone, card_number (hidden), expiry (MM/YY), cvv (hidden), price

### Proof images (Scampage + Tutorial)
- `image_urls` field type
- Seller pastes any direct image URL (postimages.org, imgbb.com, imgbox.com recommended)
- Live thumbnail previews in seller form
- Buyer sees "View N" button → ProofModal with grid + full-size viewer

### Leads category
Fields: country, description, sample (sample_text), price
- Seller pastes 10 sample leads
- Buyer sees "View Sample" button → SampleModal with scrollable list + Copy All button

### Category groups
- `CategoryGroup` model (HOSTS, SEND, LEADS, ACCOUNTS, OTHERS)
- Admin can create/rename/reorder/delete groups
- Sidebars (buyer + seller) group categories by `group.name`

### Field editor
- `/admin/categories/[id]/fields` — edit any category's fields
- Add/remove/reorder fields
- Each field: label, name (auto), type, required, visible, preview, options (for select)
- Save → writes to `Category.fields` JSON

### Order lifecycle
- Auto-complete for instant delivery (credentials, file, text)
- Manual products stay `Pending Confirmation`
- Admin: ✓ Complete, ✗ Cancel (reverses seller credit + refunds buyer)
- Report window (16h default, admin-configurable)

### Money
- Buyer debit on purchase
- Seller credit (65% commission, admin-configurable)
- `User.totalRevenue` — lifetime earnings (separate from balance)
- Withdrawals: seller requests → admin approves/rejects/marks paid
- Admin credit/debit on `/admin/users`
- Crypto deposits via NOWPayments (verified end-to-end)
- Min deposit configurable (admin setting)

### Ratings
- Buyer rates completed orders (5 stars + comment)
- Seller sees average on dashboard

### Reports
- Buyer reports against orders (16h window)
- Admin `/admin/reports` — list, filter, change status
- Seller `/seller/reports` — see reports against them

### Tickets
- Threaded messages
- Admin replies from `/admin/tickets`

### Seller panel
- Dashboard: products, sales, lifetime earnings, balance, average rating
- Sales page, Withdraw, Reports, per-category Tools

### Seller tools (`/seller/tools/[slug]`)
- Add product (3-step form: delivery → details → pricing)
- Mass Add CSV (paste or upload, live validation, preview)
- Edit product (pencil icon)
- Delete
- Search + pagination

### Admin panel (15 sections)
Dashboard, Users, Seller Requests, Category Groups, Categories, Site Settings, Payments, Financial, Orders, Withdrawals, Reports, Sellers, News, Tools (visualize all products with SOLD badge), Tickets

### User management (`/admin/users`)
- Role dropdown (BUYER/SELLER/ADMIN)
- Edit modal (username, email, role, banned)
- Credit/debit balance
- Delete (self-protected, admin-protected)
- Search + pagination + bulk delete

### Site settings (`/admin/settings`)
- Site name, description, logo (uploaded to ./uploads; default at public/brand/logo.svg), primary color
- Commission %, min deposit, min withdrawal, report window
- Admin alert email
- Feature toggles (marketplace, tickets, maintenance mode)
- Legal URLs

### Payment settings (`/admin/payments`)
- Payment provider toggle (NOWPayments / disabled)
- API key + IPN secret (stored in DB, not .env)
- Sandbox mode toggle

### Deposit flow
- `/deposit` — amount + coin picker → real crypto address + QR
- 15-second polling for confirmation
- Success screen after credit
- Webhook: signature verified via HMAC-SHA512

### Notifications bell (unread messages)
- Bell in **all three panels**: buyer header (`app/sidebar-layout.tsx`), seller header, admin sidebar
- Click → dropdown listing unread **ticket messages** (subject, author, snippet, time ago); click an item → marks it read and opens the thread (`/tickets/[id]` for buyers/sellers, `/admin/tickets/[id]` for admins)
- "Mark all read" + "View all tickets" footer; badge count (99+ cap); refreshes every 30s and on navigation
- Read tracking: `TicketMessage.readByOwnerAt` / `readByStaffAt` (per audience, so opening one item doesn't clear the others)
- API: `app/api/notifications/route.ts` — GET (unread list, role-aware) + POST `{ids}` / `{ticketId}` / `{all}`
- Opening a thread marks that ticket's messages read
- Schema change → run `npx prisma db push` after pulling

### News
- Admin creates/edits/deletes
- Shown on buyer + seller dashboards

### Responsive
- Mobile drawer sidebar (auto-close on nav)
- Independent scroll (sidebar + main)
- Tables scroll horizontally on mobile
- All admin pages responsive

## Schema models
User, Session, Product, Order, Category, CategoryGroup, Setting, Ticket, TicketMessage, Withdrawal, News, Report, Rating, Deposit, SellerRequest, SellerRequestMessage

## Key files
- `app/api/orders/route.ts` — purchase (debit buyer, credit seller, idempotency, auto-complete)
- `app/api/products/route.ts` — marketplace listing (masks hidden fields, excludes sold)
- `app/api/admin/categories/[id]/fields/route.ts` — field editor API
- `app/api/deposit/create/route.ts` — NOWPayments invoice
- `app/api/deposit/ipn/route.ts` — webhook
- `app/lib/nowpayments.ts` — NOWPayments client + signature verify
- `app/lib/email.ts` — SMTP transport (admin settings) + Resend fallback
- `app/components/ProofModal.tsx` — proof images grid
- `app/components/SampleModal.tsx` — sample leads + copy all

## What's NOT done
1. **Deploy** (still local)
2. **Sample review** in seller request (optional — thread already handles it)
3. **Postgres migration** (required for Vercel)
4. **Packaging** (README + .env.example polish for script sale)

Done since this list was written: field-level encryption (`app/lib/encrypt.ts` — hidden credential fields encrypted at rest), file delivery (local upload ≤64MB or pasted external link, plus Text List content), SMTP checker (SMTP/RDP check buttons on product pages).

## Known issues
- Hardcoded wallet address on old pay page (pay page was replaced; check `/checkout/[id]/pay` state)
- `commissionPercent` setting may not exist in DB (falls back to 65)

## Priority for next session
1. Deploy (Vercel + Postgres OR cPanel)
2. Optional: sample review
