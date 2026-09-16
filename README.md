# FundiOS

FundiOS is a progressive web app foundation for Kenyan tradespeople to turn WhatsApp enquiries into tracked, invoiced, paid jobs.

## Prerequisites

- Node.js 20+
- A Supabase account and project
- A Vercel account and CLI

## Local setup

```bash
cp .env.local.example .env.local
# Fill in the Supabase values. Never commit .env.local.
npm install
npm run dev
```

PWA features activate in production builds:

```bash
npm run build
npm start
```

Open http://localhost:3000 in Chrome.

## Vercel deployment

```bash
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_APP_URL
vercel --prod
```

## Stage 1 done checklist

- [ ] Next.js app builds with zero errors
- [ ] Supabase client helpers exist and compile
- [ ] `.env.local.example` documents required variables
- [ ] `next-pwa` generates `public/sw.js` on build
- [ ] `manifest.json` is served at `/manifest.json`
- [ ] Three icons are present
- [ ] Dark mode is the default
- [ ] Bottom navigation appears on all four dashboard tabs
- [ ] Elevated New button opens a bottom sheet
- [ ] Install banners work on Android Chrome and iOS Safari
- [ ] Offline fallback works when DevTools is offline
- [ ] Production build runs end-to-end

## Stage 2 done checklist

- [ ] profiles, config, subscriptions tables exist with RLS enabled
- [ ] handle_new_user trigger fires on signup and assigns Founding Member status
- [ ] founding_program_open auto-flips to false when the 500th member registers
- [ ] middleware protects (dashboard) routes
- [ ] unauthenticated users redirect to /login
- [ ] authenticated users with onboarding_complete = false are forced into /onboarding
- [ ] login, register, forgot-password, reset-password pages work
- [ ] onboarding wizard completes and updates the profile row
- [ ] logo upload writes to Supabase Storage bucket `logos`
- [ ] /settings shows profile and can sign out
- [ ] Founding Member banner appears on register with correct count
- [ ] npm run build passes
- [ ] Vercel deployment succeeds
