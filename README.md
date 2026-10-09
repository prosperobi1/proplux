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
- Prisma + SQLite (persists on VPS/cPanel hosting; a serverless host would need PostgreSQL)
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

The app needs three things: a persistent disk (the SQLite database and local
`./uploads` live on it), Node.js 20.9 or newer, and a public https URL.
Serverless hosts (Vercel etc.) do not work as-is because their filesystem is
read-only. Two supported paths, both running the same build:

- VPS behind nginx, managed by PM2
- cPanel Node.js App, using `start.js` as the startup file

### 1. Server setup (identical for both paths)

1. Copy the project onto the server and run `npm install` (everything the
   server needs is a regular dependency, including the Prisma CLI and tsx)
2. Create `.env` from `.env.example` and set:
   - `AUTH_SECRET`: `openssl rand -base64 32`
   - `ENCRYPTION_KEY`: `openssl rand -base64 32`. This value must stay
     identical across every redeploy, or stored credentials become unreadable
   - `AUTH_URL` and `NEXT_PUBLIC_APP_URL`: your public https URL
   - `AUTH_TRUST_HOST=true`
   - `DATABASE_URL="file:./dev.db"` (the default, works as-is on disk)
3. `npx prisma db push` then `npx prisma generate`
4. `npx tsx prisma/seed-categories.ts` and `npx tsx prisma/seed-settings.ts`
5. `npm run build`
6. Start the server using one of the two paths below, then open the site
7. Register your account and promote it to admin:
   `sqlite3 prisma/dev.db "UPDATE User SET role='ADMIN' WHERE email='you@example.com';"`
8. Configure in the admin panel: Settings (SMTP email, admin alert address,
   telegram URL, minimum deposit, branding) and Payments (NOWPayments API key
   and IPN secret). The sandbox flag starts ON; only turn it off after a
   real-money test succeeds.

### 2. VPS path (nginx + PM2)

From the project folder, with Node 20.9+ installed (NodeSource or nvm):

    npm install -g pm2
    pm2 start start.js --name proplux
    pm2 save
    pm2 startup    # run the command it prints, so the app survives reboots

nginx site forwarding to the app:

    server {
        listen 80;
        server_name yourdomain.com;
        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            client_max_body_size 70m;   # product uploads up to 64MB
        }
    }

Then issue HTTPS with `certbot --nginx`, and open only 80/443 (plus your SSH
port) in the firewall.

### 3. cPanel path (Setup Node.js App)

1. Upload the project (git clone in Terminal, or an archive via File Manager)
2. cPanel -> Setup Node.js App -> Create Application:
   - Node version: the newest 20.x or newer offered by your plan
   - Application root: the project folder
   - Application URL: your domain
   - Startup file: `start.js`
3. Create `.env` in the application root as described above (the form's
   environment variables work too; the .env file keeps one source of truth)
4. In Terminal, from the application root, run server-setup steps 3 to 5
   (db push, seeds, build)
5. Click Restart. cPanel assigns the port; `start.js` reads it from `$PORT`

### Backups

Back up these three together: `prisma/dev.db`, `./uploads/`, and `.env`.
Losing `.env` (or changing `ENCRYPTION_KEY`) makes every stored credential
undecryptable.

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
