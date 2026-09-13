import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import clerk from '@clerk/astro';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [
    clerk({
      signInUrl: '/auth/login',
      signUpUrl: '/auth/register',
      enableEnvSchema: false,
    }),
  ],
  session: false,
  site: 'https://resumefoundries.com',
});
