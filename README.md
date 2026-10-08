# Proplux - Multi-Vendor Digital Marketplace

A modern multi-vendor marketplace built with Next.js 16, TypeScript, Prisma, and NextAuth. Three roles: BUYER, SELLER, ADMIN.

## Features

- Marketplace with categories, dynamic per-category fields, and bulk purchase
- Multi-vendor — sellers list products, buyers purchase, admins moderate
- Wallet system — buyers fund an account balance; purchases debit instantly
- Seller earnings — 65% commission (configurable), lifetime revenue tracking
- Withdrawals — sellers request payouts, admins approve/reject/mark paid
- Reports — buyers can report bad orders within a configurable window
- Support tickets — buyers and sellers open tickets, admins reply
- Forgot/reset password — emailed reset link (SMTP), choose a new password
- Notifications bell — unread ticket replies in buyer, seller and admin panels; click to open the thread
- Admin panel — users, orders, categories, settings, financials, news
- Branding — uploadable logo, site name, primary color, all admin-configurable (logo stored locally in ./uploads)

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Prisma + SQLite (dev) / PostgreSQL (production)
- NextAuth (credentials, JWT)
- Tailwind CSS
- lucide-react for icons
- Local upload storage (./uploads) with access-controlled downloads (/api/files)

## Quick Start

1. Install dependencies

    npm install

2. Configure environment

    cp .env.example .env

Then edit .env:

- Set AUTH_SECRET to a random string: openssl rand -base64 32
- Set ENCRYPTION_KEY (encrypts hidden credential fields at rest): openssl rand -base64 32 — keep the same value across deploys, or existing credentials become unreadable
- Uploads are stored in the project (./uploads) — no third-party upload token needed
- Production: also set AUTH_URL and NEXT_PUBLIC_APP_URL to your public https URL (payment callbacks depend on it)

3. Set up the database

    npx prisma db push
    npx prisma generate

4. Seed initial data

    npx tsx prisma/seed-categories.ts
    npx tsx prisma/seed-settings.ts

5. Create an admin account

Register a normal account via the UI, then promote it:

    sqlite3 prisma/dev.db "UPDATE User SET role='ADMIN' WHERE email='you@example.com';"

Or use npx prisma studio to edit the row manually.

6. Run the dev server

    npm run dev

Open http://localhost:3000

## Testing Roles

- Buyer: register normally
- Seller: admin promotes via /admin/users
- Admin: SQL command above, or promote via /admin/users

## Project Structure

app/
  (main)/           Buyer-facing routes (dashboard, products, checkout, orders, tickets, deposit)
  admin/            Admin panel (role-gated)
  seller/           Seller panel (role-gated)
  login/, register/ Auth pages
  api/              All API routes
  components/       Shared components (Branding, etc.)
  lib/              Prisma client, auth config, countries list
prisma/
  schema.prisma     Data model
  seed*.ts          Seed scripts

## Deployment

Vercel (recommended):

1. Push to GitHub
2. Import on Vercel
3. Set env vars in Vercel dashboard: DATABASE_URL (Postgres), AUTH_SECRET, AUTH_TRUST_HOST=true
   (note: local file uploads need a persistent disk — use VPS/shared Node hosting; Vercel's filesystem is read-only)
4. Switch Prisma datasource to postgresql in prisma/schema.prisma
5. Run npx prisma db push against the production DB once

cPanel (Node.js App):

1. Upload the project
2. In cPanel -> Setup Node.js App:
   - Node version 20+
   - Application root: your project folder
   - Startup file: node_modules/.bin/next
   - Environment variables: same as above
3. Run npm install, npx prisma db push, npx prisma generate from the terminal
4. Delete app/api/deposit/dev/ before going live

## Configuration

All admin-configurable from /admin/settings:

- Site name, description, logo, primary color
- Commission % (default 65)
- Minimum withdrawal (default $10)
- Report window in hours (default 16)
- Feature toggles (marketplace, tickets, maintenance mode)
- Crypto payments — NOWPayments keys (API key, IPN secret, sandbox) configured in **Admin → Payments**, stored in the DB — not in .env

## Not Yet Implemented

- Product images — products are text/metadata only (proof/sample images are pasted URLs)

Previously listed here and now done: crypto payments (NOWPayments in Admin → Payments), SMTP email (Admin → Settings → Email), forgot/reset password (backend at /api/auth/forgot-password + /api/auth/reset-password).

## License

This is a commercial template. You may use it to build and deploy your own marketplace. You may not redistribute the source code as a competing template.
