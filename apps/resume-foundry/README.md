# resume-foundry (Astro on Cloudflare Workers)

This is the only application in the `excelsior091224/ResumeFoundry` repository. The legacy Laravel/VPS implementation has been removed; this Astro app now runs entirely on Cloudflare Workers' free tier.

## Stack

- Astro running on Cloudflare Workers
- Cloudflare D1 for reusable career data
- Cloudflare R2 for temporary or paid export files
- Optional Cloudflare Workers AI or external AI APIs for summaries and reviews
- Clerk authentication (email/password and social providers)

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run db:migrate:local
npm run check:bundle-secrets
```

## One-shot resume generator on Workers

This app now also contains a stateless one-shot resume generator migrated from the legacy Laravel/VPS implementation. It lives alongside the SaaS placeholder pages and does **not** depend on D1, Clerk, or auth.

- Page: `http://localhost:4321/resume`
- Preview API: `POST /api/resume/preview`
- Gemini summary API: `POST /api/resume/summary`
- Downloads:
  - `POST /api/resume/download/pdf`
  - `POST /api/resume/download/docx`

### What it does

- collects a full Japanese resume payload in the browser
- keeps a local browser-only draft for convenience
- renders a live preview without saving to a database
- generates PDFs in the Workers runtime with `pdf-lib` + embedded `IPAexGothic.ttf`
- generates DOCX files in the Workers runtime with `docx`
- optionally calls Gemini for a 250-character career summary

### Local run / build

```bash
npm install
npm run dev
npm run build
npm run preview
```

Open `/resume` locally, then use the page UI or `curl` against the `/api/resume/*` endpoints.

### Gemini configuration

`GEMINI_API_KEY` must be configured as a Wrangler secret for local preview/dev and deployment:

```bash
wrangler secret put GEMINI_API_KEY
```

`GEMINI_MODEL` defaults to `gemini-3.5-flash-lite` in `wrangler.jsonc`. Override it through Wrangler environment variables if needed.

The D1 database (`astro-resume-foundry`) stores Clerk user mappings and saved career data. Clerk manages credentials, OAuth connections, email verification, and sessions. The R2 bucket (`astro-resume-foundry-exports`) is reserved for future export storage. The one-shot resume generator does not use them.

## Authentication

The `/app/*` pages and `/api/careers` endpoints require Clerk authentication. Clerk's prebuilt sign-in and sign-up screens automatically show the social providers enabled for the application in the Clerk Dashboard. Career records remain in D1 and are isolated by Clerk's user ID.

Copy `.dev.vars.example` to `.dev.vars`, then add the development keys from the Clerk Dashboard. The public key must also be available as `PUBLIC_CLERK_PUBLISHABLE_KEY` when `astro build` runs so that Clerk's browser UI can initialize:

```bash
cp .dev.vars.example .dev.vars
```

For production, provide `PUBLIC_CLERK_PUBLISHABLE_KEY` to the build environment and configure the Worker runtime bindings. The publishable key is public and can be a Wrangler variable; the secret key must be an encrypted secret:

```bash
wrangler secret put CLERK_SECRET_KEY
```

`npm run build` temporarily hides `.dev.vars`, passes only the publishable key to Astro, and fails if a Clerk secret is found in `dist`. Do not replace this command with a direct `astro build` in CI or deployment automation.

Enable Google, GitHub, or other OAuth providers under **Clerk Dashboard → Configure → SSO connections**. No application code change is required when providers are enabled.

Run the D1 migrations before starting the application:

```bash
npm run db:migrate:local
```

## Analytics

Google Tag Manager container `GTM-5N2CL6R2` is loaded from the shared Astro layout on every HTML page. Google Analytics tags and consent settings remain managed in the Google Tag Manager container.

## Legal and support pages

- `/terms`: terms of service
- `/privacy`: privacy policy covering Clerk, Cloudflare D1, Google Analytics, Gemini, and stored career data
- `/contact`: support, personal-data requests, and account/data deletion requests

The registration page links to the terms and privacy policy. Before introducing paid plans, obtain a Japanese legal review and add the operator disclosures and transaction terms required for the paid offering.

Authenticated users can permanently delete their Clerk account and all associated D1 career data from `/app/account`. The deletion endpoint requires an authenticated same-origin request and the exact Japanese confirmation phrase shown on the page.

## Deployment

```bash
wrangler login   # or set CLOUDFLARE_API_TOKEN
npm run build
npm run deploy
```

`npm run deploy` runs the safe build, scans the output for Clerk secret keys, applies pending remote D1 migrations, and only then deploys the Worker. Configure the production Clerk bindings before running it.

Production: https://resumefoundries.com (custom domain mapped to the deployed Worker `astro-resume-foundry`).

## Migration principle

The MVP should store reusable career facts and generate resumes from those facts, rather than storing generated documents as the primary data source. The one-shot resume generator (`/resume`) and the saved career-log SaaS placeholder pages (`/app/*`) live side by side in this same app while the SaaS model is validated.
