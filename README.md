# LMU Campus Care — TypeScript + Prisma + PostgreSQL

A responsive Landmark University student-services and council operations portal built with Next.js App Router, React, TypeScript, Prisma ORM, and PostgreSQL. Supabase is not used.

## Features
- Student registration and sign-in using university email; bcrypt password hashing and HTTP-only signed sessions.
- Student profile editing and profile photo upload (images are stored in PostgreSQL as data URLs; keep uploads small).
- Arrival Desk: register goods, quantities, notes, expected date/time, self-pickup or ₦1,000 hostel delivery, status tracking, inspection notes, contraband flags, delivery PIN.
- Official Gate Date: view active schedule and schedule history; Welfare/VCM can publish and archive schedules.
- Lost & Found: report missing items, private ownership proof, student-found items, P.R.O. found items, claim requests, claim review, claimed status.
- Hostel Watch: maintenance/security reports with priority; Welfare/VCM can assign and update resolution.
- Role-aware council workspaces for Welfare, Transport, P.R.O. and VCM; audit activity log for VCM.
- Responsive desktop/mobile layout, loading/error states, form validation and database-backed records.
- Optional Google sign-in for existing, verified `@lmu.edu.ng` student accounts (Google credentials must be configured).

## Requirements
- Node.js 20.9+ (Node.js 22 recommended)
- PostgreSQL 14+
- npm

## Setup on Windows
1. Install PostgreSQL and open pgAdmin.
2. Create a database named `lmu_campus_care`.
3. Copy `.env.example` to `.env.local` in the project root.
4. Update `DATABASE_URL` with your local PostgreSQL password.
5. Generate a secret in PowerShell:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Paste it as `AUTH_SECRET` in `.env.local`.
6. Open a terminal in the project folder and run:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npm run dev
   ```
7. Open http://localhost:3000.

`prisma db push` is an easy first-time setup. For a production workflow, use migrations and commit the generated migration files.

## Create council accounts
Council accounts cannot self-register. Create each account from the project folder:

```bash
npm run council:create -- "Welfare Officer" welfare.officer@lmu.edu.ng "A-Strong-Password-At-Least-12" welfare
npm run council:create -- "Transport Officer" transport.officer@lmu.edu.ng "A-Strong-Password-At-Least-12" transport
npm run council:create -- "Public Relations Officer" pro.officer@lmu.edu.ng "A-Strong-Password-At-Least-12" pro
npm run council:create -- "VCM Administrator" vcm.admin@lmu.edu.ng "A-Strong-Password-At-Least-12" vcm
```

Replace the example names/emails/passwords with real council account details. Do not share these credentials or commit them to GitHub. Sign in at `/auth?portal=council`.

## Optional Google sign-in
1. Create OAuth credentials in Google Cloud Console.
2. Add `http://localhost:3000/api/auth/google/callback` as an authorised redirect URI for local development.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `.env.local`.
4. Restart the development server.

Google sign-in only permits verified `@lmu.edu.ng` addresses that already have a student account, so the matric number remains part of student registration. Set the production callback URL to your deployed domain.

## Production database and deployment
- Use a managed PostgreSQL provider or a secured PostgreSQL server. Supabase is not required.
- Configure `DATABASE_URL` and `AUTH_SECRET` as server-only environment variables on your host.
- Configure Google OAuth values if using Google sign-in.
- Run `npx prisma migrate deploy` when using committed migrations, or use a controlled schema migration workflow. Avoid `db push` against production once real data exists.
- Run `npm run build`, then test all workflows with separate student and council accounts.

## Important deployment notes
- Uploaded images are kept as data URLs in PostgreSQL and limited to about 1.5 MB per image. For a large production deployment, replace this with durable object storage and store only the file URL in PostgreSQL.
- Google OAuth is optional. Password-based authentication works without Google credentials.
- Configure rate limiting, email verification/password recovery, backup retention, and university-approved account verification before public production use. No application can be guaranteed to work with every hosting/database configuration without running it in that environment; follow the build and workflow test checklist before launch.
