# resume-foundry (Astro on Cloudflare Workers)

This is the only application in the `excelsior091224/ResumeFoundry` repository. The legacy Laravel/VPS implementation has been removed; this Astro app now runs entirely on Cloudflare Workers' free tier.

## Stack

- Astro running on Cloudflare Workers
- Cloudflare D1 for reusable career data
- Cloudflare R2 for temporary or paid export files
- Optional Cloudflare Workers AI or external AI APIs for summaries and reviews
- Clerk is the first authentication candidate for MVP validation

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run db:migrate:local
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

The D1 database (`astro-resume-foundry`) and R2 bucket (`astro-resume-foundry-exports`) referenced in `wrangler.jsonc` are provisioned for the future saved career-log SaaS features; the one-shot resume generator does not use them.

## Deployment

```bash
wrangler login   # or set CLOUDFLARE_API_TOKEN
npm run build
npm run deploy
```

Production: https://resumefoundries.com (custom domain mapped to the deployed Worker `astro-resume-foundry`).

## Migration principle

The MVP should store reusable career facts and generate resumes from those facts, rather than storing generated documents as the primary data source. The one-shot resume generator (`/resume`) and the saved career-log SaaS placeholder pages (`/app/*`) live side by side in this same app while the SaaS model is validated.
