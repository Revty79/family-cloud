# Family Cloud

Phase 1 foundation for Family Cloud:

- Public landing page (`/`)
- Authentication flows:
  - Log in (`/login`)
  - Sign up (`/signup`)
  - Forgot password (`/forgot-password`)
  - Reset password (`/reset-password?token=...`)
- Protected authenticated shell (`/dashboard`)
- Route protection and session persistence

## Stack

- Next.js (App Router)
- PostgreSQL
- Drizzle ORM
- Better Auth

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

3. Set `DATABASE_URL` to your PostgreSQL instance and set a long `BETTER_AUTH_SECRET`.

4. Generate Better Auth Drizzle schema (already included, re-run when auth config/plugins change):

```bash
npm run auth:generate
```

5. Create and apply database migrations:

```bash
npm run db:generate
npm run db:migrate
```

6. Start development server:

```bash
npm run dev
```

Open http://localhost:3000

## Password Reset Emails

- If SMTP variables are configured, reset emails are sent through your mail server.
- If SMTP is not configured, reset links are logged to the server console for local development.

## Scripts

- `npm run dev` - run Next.js dev server
- `npm run build` - production build
- `npm run lint` - lint codebase
- `npm run auth:generate` - generate Better Auth Drizzle schema
- `npm run db:generate` - generate Drizzle migration
- `npm run db:migrate` - apply Drizzle migration
