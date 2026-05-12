/**
 * generate-sitemap.mjs — emit a sitemap.xml reflecting the live DB
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/generate-sitemap.mjs
 *
 * Reads public editions, categories, posts, and curators, and writes
 * dist/sitemap.xml (so it's picked up by the build).
 */

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SITE = process.env.SITE_URL || 'https://fokusaward.com';
const OUT = process.env.OUT || resolve('dist', 'sitemap.xml');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY. Skipping sitemap generation.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const staticPaths = [
  '/',
  '/about',
  '/apply',
  '/editions',
  '/winners',
  '/gallery',
  '/news',
  '/contact',
  '/curators',
  '/privacy',
  '/terms',
];

function urlTag(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${SITE}${loc}</loc>${lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

const rows = [];

for (const p of staticPaths) {
  rows.push(urlTag(p, null, p === '/' ? 'weekly' : 'monthly', p === '/' ? '1.0' : '0.7'));
}

try {
  const { data: eds } = await supabase
    .from('editions')
    .select('slug, updated_at, year, published, results_published')
    .eq('published', true);
  for (const e of eds || []) {
    rows.push(urlTag(`/gallery/${e.year}`, e.updated_at, 'monthly', '0.8'));
  }
} catch (err) { console.warn('editions failed', err); }

try {
  const { data: cats } = await supabase
    .from('categories')
    .select('slug, updated_at');
  for (const c of cats || []) {
    if (c.slug) rows.push(urlTag(`/apply/${c.slug}`, c.updated_at, 'monthly', '0.7'));
  }
} catch (err) { console.warn('categories failed', err); }

try {
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, status')
    .eq('status', 'published');
  for (const p of posts || []) {
    rows.push(urlTag(`/news/${p.slug}`, p.updated_at, 'monthly', '0.6'));
  }
} catch (err) { console.warn('posts failed', err); }

try {
  const { data: curators } = await supabase
    .from('curators')
    .select('slug, updated_at');
  for (const c of curators || []) {
    if (c.slug) rows.push(urlTag(`/curators/${c.slug}`, c.updated_at, 'yearly', '0.5'));
  }
} catch { /* table may not exist */ }

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.join('\n')}
</urlset>
`;

await writeFile(OUT, xml, 'utf8');
console.log(`Wrote ${OUT} with ${rows.length} URLs.`);
