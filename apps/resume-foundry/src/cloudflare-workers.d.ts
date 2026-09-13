declare module 'cloudflare:workers' {
  export const env: Env;
}

declare namespace Cloudflare {
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
}
