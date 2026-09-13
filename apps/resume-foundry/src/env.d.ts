/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  EXPORTS: R2Bucket;
  AI?: Ai;
  PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals {
    runtime?: {
      env: Env;
      cf?: Record<string, unknown>;
      ctx?: ExecutionContext;
    };
  }
}
