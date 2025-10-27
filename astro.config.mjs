import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';

const siteUrl = process.env.SITE_URL ?? 'https://astro-blog.example.com';

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  integrations: [mdx(), sitemap()],
});
