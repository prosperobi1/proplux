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
- Prisma + PostgreSQL (Vercel + Neon; the Docker/VPS path can point at any Postgres)
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
- Set PRISMA_DATABASE_URL to a PostgreSQL connection string. Fastest: `npx vercel env pull` after linking the project (gives you the hosted one)
- Without BLOB_READ_WRITE_TOKEN, uploads are stored in the project (./uploads); on Vercel the token switches them to Blob storage automatically
- Production: also set NEXT_PUBLIC_APP_URL to your public https URL (payment callbacks depend on it)

3. Set up the database

    npx prisma db push
    npx prisma generate

4. Seed initial data

    npx tsx prisma/seed-categories.ts
    npx tsx prisma/seed-settings.ts

Coming from the old SQLite dev.db? Copy its data over once:

    node scripts/migrate-sqlite-to-postgres.js

5. Create an admin account

Register a normal account via the UI, then promote it:

    npx prisma db push  # ensures the client exists
    npx tsx -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.update({where:{email:'you@example.com'},data:{role:'ADMIN'}}).finally(()=>p.$disconnect())"

Or use `npx prisma studio` to edit the row manually.

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

The app runs on Vercel with a hosted Postgres database (Neon, created through
the Vercel marketplace) and Vercel Blob for uploaded files. Prisma needs no
persistent disk anymore; Blob replaces `./uploads`.

### First deploy

1. Push this repository to GitHub, then in Vercel: Add New -> Project ->
   import it. Vercel detects Next.js; no build settings needed
   (`postinstall` runs `prisma generate`, then `next build`)
2. In the project's Storage tab, create a Postgres (Neon) database and a Blob
   store. Both attach their env vars automatically
   (`PRISMA_DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`)
3. Add the remaining env vars in Settings -> Environment Variables:
   - `AUTH_SECRET`: `openssl rand -base64 32`
   - `ENCRYPTION_KEY`: `openssl rand -base64 32`. Keep this identical across
     every redeploy, or stored credentials become unreadable
   - `NEXT_PUBLIC_APP_URL`: your deployment URL (update when a domain is
     attached; NOWPayments IPN callbacks are built from it)
   - `AUTH_TRUST_HOST=true`
4. Deploy. The site loads but the database is empty until step 5
5. From your machine, with the project checked out:
   - `npx vercel link` (once, ties the folder to the project)
   - `npx vercel env pull` (writes .env.local with PRISMA_DATABASE_URL etc.)
   - `npx prisma db push` (creates tables in Postgres)
   - `node scripts/migrate-sqlite-to-postgres.js` (one-shot copy of an old
     SQLite dev.db, if you have one; re-runnable, skips existing rows)
   - `npx tsx prisma/seed-categories.ts` and `npx tsx prisma/seed-settings.ts`
6. Register your account, then promote it to admin from your machine:
   `npx vercel env pull && npx tsx -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.update({where:{email:'you@example.com'},data:{role:'ADMIN'}}).finally(()=>p.\$disconnect())"`
7. Configure in the admin panel: Settings (SMTP email, admin alert address,
   telegram URL, minimum deposit, branding) and Payments (NOWPayments API key
   and IPN secret). The sandbox flag starts ON; only turn it off after a
   real-money test succeeds

### Limits to know

- Serverless request bodies cap at ~4.5MB, so product file uploads over 4MB
  are refused with a message pointing sellers to delivery links (the app's
  normal flow for large software). Raise this later with direct-to-Blob
  client uploads if needed
- Emails go through SMTP settings in the admin panel, or Resend when
  `RESEND_API_KEY` is set

### Backups

- Postgres: Neon's daily backups, plus `npx vercel env pull` output stored
  somewhere safe (it holds `PRISMA_DATABASE_URL`)
- `.env` values `AUTH_SECRET` and `ENCRYPTION_KEY`: losing them, or changing
  `ENCRYPTION_KEY`, makes every stored credential undecryptable
- Blob store: files are kept by Vercel; nothing to copy for a test run

### Self-hosting (VPS with Postgres)

The Vercel-specific parts are the Blob storage branch in
`app/api/uploads` and `app/api/files` (both fall back to `./uploads` on disk
when `BLOB_READ_WRITE_TOKEN` is unset). With any VPS that has Node 20.9+, a
Postgres server, and nginx, `npm install && npx prisma db push && npm run
build && node start.js` works the same; point nginx at 127.0.0.1:3000 with
`client_max_body_size 70m`.

## Configuration

All admin-configurable from /admin/settings:

- Site name, description, logo, primary color
- Commission % (default 65)
- Minimum withdrawal (default $10)
- Report window in hours (default 16)
- Admin alert address (new orders, reports, withdrawals)
- Feature toggles (marketplace, tickets, maintenance mode)
- Crypto payments — NOWPayments keys (API key, IPN secret, sandbox) configured in **Admin → Payments**, stored in the DB — not in .env

## Not Yet Implemented

- Product images — products are text/metadata only (proof/sample images are pasted URLs)

Previously listed here and now done: crypto payments (NOWPayments in Admin → Payments), SMTP email (Admin → Settings → Email), forgot/reset password (backend at /api/auth/forgot-password + /api/auth/reset-password).

## License

This is a commercial template. You may use it to build and deploy your own marketplace. You may not redistribute the source code as a competing template.
