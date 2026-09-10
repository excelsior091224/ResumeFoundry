/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  EXPORTS: R2Bucket;
  AI?: Ai;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

declare namespace App {
  interface Locals extends Runtime {}
}
