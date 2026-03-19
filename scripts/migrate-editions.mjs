/**
 * Migration script: Scrape all previous FOKUS Award editions,
 * download photos, upload to Cloudflare R2, and produce gallery-data.json.
 *
 * Usage:  node scripts/migrate-editions.mjs
 *
 * Env vars are read from .env in the project root.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// ── helpers ──────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/** Read .env manually (no dotenv dependency) */
function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) throw new Error('.env not found');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── R2 client ────────────────────────────────────────────────────
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

// ── Edition definitions ──────────────────────────────────────────
// Each edition scraped from https://www.fokusaward.com/en/editions/
const EDITIONS = [
  { slug: 'edicioni-i-16-te-2025', year: 2025, number: 16, title: 'IFFA 16', type: 'categorized' },
  { slug: 'edicioni-i-14-te-2023', year: 2023, number: 14, title: 'IFFA 14', type: 'categorized' },
  { slug: 'edicioni-i-13-te-2022', year: 2022, number: 13, title: 'IFFA 13', type: 'categorized' },
  { slug: 'fokus-2021-12th-edition', year: 2021, number: 12, title: '12th Edition', type: 'gallery' },
  { slug: 'fokus-2020-11th-edition', year: 2020, number: 11, title: '11th Edition', type: 'gallery' },
  { slug: 'fokus-2019', year: 2019, number: 10, title: '10th Edition', type: 'gallery' },
  { slug: 'fokus-2018', year: 2018, number: 9, title: '9th Edition', type: 'gallery' },
  { slug: 'fokus-2017', year: 2017, number: 8, title: '8th Edition', type: 'gallery' },
  { slug: 'fokus-2014', year: 2014, number: 7, title: '7th Edition', type: 'gallery' },
  { slug: 'fokus-2011', year: 2011, number: 6, title: '6th Edition', type: 'gallery' },
  { slug: 'fokus-2010', year: 2010, number: 5, title: '5th Edition', type: 'gallery' },
  { slug: 'fokus-2009', year: 2009, number: 4, title: '4th Edition', type: 'gallery' },
  { slug: 'fokus-2008', year: 2008, number: 3, title: '3rd Edition', type: 'gallery' },
  { slug: 'fokus-2007', year: 2007, number: 2, title: '2nd Edition', type: 'gallery' },
  { slug: 'fokus-2006', year: 2006, number: 1, title: '1st Edition', type: 'gallery' },
];

// Also scrape the 2025 participants shortlist
const SHORTLIST_PAGES = [
  { slug: 'shortlist2025', year: 2025, number: 16 },
];

// ── Fetch helpers ────────────────────────────────────────────────
const DELAY = 1500; // ms between requests to be polite
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHTML(url) {
  console.log(`  Fetching ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'FokusAward-Migration/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'FokusAward-Migration/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { buf, contentType };
}

// ── R2 upload ────────────────────────────────────────────────────
async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToR2(key, buf, contentType) {
  // Skip if already uploaded
  if (await objectExists(key)) {
    console.log(`    ✓ Already exists: ${key}`);
    return `${R2_PUBLIC_URL}/${key}`;
  }
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buf,
    ContentType: contentType,
  }));
  console.log(`    ↑ Uploaded: ${key}`);
  return `${R2_PUBLIC_URL}/${key}`;
}

// ── URL normalization ────────────────────────────────────────────
/** Strip WP thumbnail suffix (e.g. -1024x683) to get the original full‑size image */
function getOriginalUrl(url) {
  return url.replace(/-\d+x\d+(?=\.\w+$)/, '');
}

/** Derive a clean filename from a URL */
function filenameFromUrl(url) {
  const u = new URL(url);
  return decodeURIComponent(u.pathname.split('/').pop());
}

// ── Scraping: categorized editions (2022, 2023, 2025) ────────────
function scrapeCategorized(html, edition) {
  const $ = load(html);
  const photos = [];
  const seen = new Set();

  // Find all category headings
  $('h2').each((_i, el) => {
    const heading = $(el).text().trim();
    // Match patterns like: THE WINNERS FOR CATEGORY:"PRESS" or MAIN CATEGORY
    const catMatch = heading.match(/CATEGORY[:\s]*["""]?([^"""]+)/i) ||
                     heading.match(/MAIN\s+CATEGORY[:\s]*["""]?(.*)/i);
    if (!catMatch && !/MAIN\s+CATEGORY/i.test(heading)) return;

    const category = catMatch
      ? catMatch[1].replace(/["""]/g, '').trim() || 'Main'
      : 'Main';

    // Collect images in the sibling slider/container until the next h2
    let container = $(el).next();
    // Walk siblings collecting images
    while (container.length && !container.is('h2')) {
      container.find('img').each((_j, img) => {
        let src = $(img).attr('data-src') || $(img).attr('data-lazy-src') || $(img).attr('src');
        if (!src || src.includes('data:image')) {
          // skip placeholders
        } else {
          src = getOriginalUrl(src);
          if (!seen.has(src)) {
            seen.add(src);
            const alt = $(img).attr('alt') || '';
            photos.push({
              sourceUrl: src,
              category,
              isWinner: true,
              photographer: alt || null,
              edition: edition.number,
              year: edition.year,
            });
          }
        }
      });
      container = container.next();
    }
  });

  // If we also want to catch slider images that are links
  $('a[href*="wp-content/uploads"] img, .elementor-image img, .swiper-slide img').each((_i, img) => {
    let src = $(img).attr('data-src') || $(img).attr('data-lazy-src') || $(img).attr('src');
    if (!src || src.includes('data:image')) return;
    src = getOriginalUrl(src);
    if (!seen.has(src)) {
      seen.add(src);
      photos.push({
        sourceUrl: src,
        category: null,
        isWinner: true,
        photographer: $(img).attr('alt') || null,
        edition: edition.number,
        year: edition.year,
      });
    }
  });

  return photos;
}

// ── Scraping: gallery editions (flat grid of images) ─────────────
function scrapeGallery(html, edition) {
  const $ = load(html);
  const photos = [];
  const seen = new Set();

  // Extract winner info from the page text
  let winnerName = null;
  const winnerMatch = $('body').text().match(/(?:First Prize|WINNER|WINNNER)[^\n]*?–\s*([^\n–]+)/i);
  if (winnerMatch) {
    winnerName = winnerMatch[1].trim();
  }

  // Gallery images are typically in <a> tags linking to the full image
  $('a[href*="wp-content/uploads"]').each((_i, a) => {
    let href = $(a).attr('href');
    if (!href) return;
    href = getOriginalUrl(href);

    // Also check for img inside
    const img = $(a).find('img');
    let src = img.length
      ? (img.attr('data-src') || img.attr('data-lazy-src') || img.attr('src'))
      : null;
    if (src) src = getOriginalUrl(src);

    const url = href;
    if (seen.has(url)) return;
    seen.add(url);

    const alt = img.length ? (img.attr('alt') || '') : '';

    photos.push({
      sourceUrl: url,
      category: null,
      isWinner: false,
      photographer: alt || filenameFromUrl(url).replace(/\.\w+$/, '').replace(/[-_]/g, ' '),
      edition: edition.number,
      year: edition.year,
    });
  });

  // Also collect any standalone <img> tags with wp-content URLs
  $('img[src*="wp-content/uploads"]').each((_i, img) => {
    let src = $(img).attr('data-src') || $(img).attr('data-lazy-src') || $(img).attr('src');
    if (!src || src.includes('data:image')) return;
    src = getOriginalUrl(src);
    if (seen.has(src)) return;
    // Skip jury images and banners
    const alt = $(img).attr('alt') || '';
    if (/juri|jury|banner|logo|cookie/i.test(alt)) return;
    seen.add(src);
    photos.push({
      sourceUrl: src,
      category: null,
      isWinner: false,
      photographer: alt || null,
      edition: edition.number,
      year: edition.year,
    });
  });

  // Mark the first photo as winner if we found a winner name
  if (winnerName && photos.length > 0) {
    photos[0].isWinner = true;
  }

  return photos;
}

// ── Scraping: shortlist/participants page ────────────────────────
function scrapeShortlist(html, entry) {
  const $ = load(html);
  const photos = [];
  const seen = new Set();

  $('img[src*="wp-content/uploads"]').each((_i, img) => {
    let src = $(img).attr('data-src') || $(img).attr('data-lazy-src') || $(img).attr('src');
    if (!src || src.includes('data:image')) return;
    src = getOriginalUrl(src);
    if (seen.has(src)) return;
    const alt = $(img).attr('alt') || '';
    if (/juri|jury|banner|logo|cookie/i.test(alt)) return;
    seen.add(src);
    photos.push({
      sourceUrl: src,
      category: null,
      isWinner: false,
      photographer: alt || null,
      edition: entry.number,
      year: entry.year,
    });
  });

  $('a[href*="wp-content/uploads"]').each((_i, a) => {
    let href = $(a).attr('href');
    if (!href) return;
    href = getOriginalUrl(href);
    if (seen.has(href)) return;
    seen.add(href);
    const img = $(a).find('img');
    const alt = img.length ? (img.attr('alt') || '') : '';
    photos.push({
      sourceUrl: href,
      category: null,
      isWinner: false,
      photographer: alt || null,
      edition: entry.number,
      year: entry.year,
    });
  });

  return photos;
}

// ── Main pipeline ────────────────────────────────────────────────
async function main() {
  console.log('=== FOKUS Award Gallery Migration ===\n');

  const allPhotos = [];
  const editionsMeta = [];

  // 1. Scrape each edition page
  for (const edition of EDITIONS) {
    console.log(`\n── Edition ${edition.number} (${edition.year}): ${edition.title} ──`);
    const url = `https://www.fokusaward.com/en/${edition.slug}/`;

    try {
      const html = await fetchHTML(url);

      // Extract winner and jury info
      const $ = load(html);
      let winnerInfo = null;
      const winText = $('body').text();
      const wm = winText.match(/(?:First Prize|WINNER|WINNNER)[^\n]*?–\s*([^\n]+)/i);
      if (wm) winnerInfo = wm[1].trim().replace(/\s+/g, ' ');

      let theme = null;
      // For categorized: extract from main category heading
      const themeMatch = $('h2').text().match(/MAIN\s+CATEGORY[:\s]*["""]?([^"""]+)/i);
      if (themeMatch) theme = themeMatch[1].trim();

      const photos = edition.type === 'categorized'
        ? scrapeCategorized(html, edition)
        : scrapeGallery(html, edition);

      console.log(`  Found ${photos.length} photos`);
      allPhotos.push(...photos);

      editionsMeta.push({
        number: edition.number,
        year: edition.year,
        title: edition.title,
        slug: edition.slug,
        theme,
        winner: winnerInfo,
        photoCount: photos.length,
      });

      await sleep(DELAY);
    } catch (err) {
      console.error(`  ERROR scraping edition ${edition.slug}: ${err.message}`);
      editionsMeta.push({
        number: edition.number,
        year: edition.year,
        title: edition.title,
        slug: edition.slug,
        theme: null,
        winner: null,
        photoCount: 0,
        error: err.message,
      });
    }
  }

  // 2. Scrape shortlist pages
  for (const entry of SHORTLIST_PAGES) {
    console.log(`\n── Shortlist ${entry.year} ──`);
    const url = `https://www.fokusaward.com/en/${entry.slug}/`;
    try {
      const html = await fetchHTML(url);
      const photos = scrapeShortlist(html, entry);
      console.log(`  Found ${photos.length} participant photos`);
      // Mark these as participants (non-winners) for the edition
      allPhotos.push(...photos);
      await sleep(DELAY);
    } catch (err) {
      console.error(`  ERROR scraping shortlist: ${err.message}`);
    }
  }

  // Deduplicate by sourceUrl
  const uniqueMap = new Map();
  for (const p of allPhotos) {
    const existing = uniqueMap.get(p.sourceUrl);
    if (existing) {
      // Keep the more informative entry (winner > non-winner, with category > without)
      if (p.isWinner) existing.isWinner = true;
      if (p.category && !existing.category) existing.category = p.category;
    } else {
      uniqueMap.set(p.sourceUrl, { ...p });
    }
  }
  const deduped = Array.from(uniqueMap.values());
  console.log(`\n=== Total unique photos: ${deduped.length} ===\n`);

  // 3. Download and upload to R2
  let uploaded = 0;
  let failed = 0;
  const galleryData = [];

  for (const photo of deduped) {
    const filename = filenameFromUrl(photo.sourceUrl);
    const r2Key = `gallery/${photo.year}/${filename}`;

    try {
      const { buf, contentType } = await downloadImage(photo.sourceUrl);
      const publicUrl = await uploadToR2(r2Key, buf, contentType);

      galleryData.push({
        r2Key,
        url: publicUrl,
        category: photo.category,
        isWinner: photo.isWinner,
        photographer: photo.photographer,
        edition: photo.edition,
        year: photo.year,
      });
      uploaded++;
    } catch (err) {
      console.error(`    ✗ Failed ${photo.sourceUrl}: ${err.message}`);
      failed++;
    }

    // Small delay to avoid hammering the server
    if (uploaded % 5 === 0) await sleep(500);
  }

  console.log(`\n=== Upload complete: ${uploaded} succeeded, ${failed} failed ===\n`);

  // 4. Write gallery data JSON
  const output = {
    generatedAt: new Date().toISOString(),
    editions: editionsMeta,
    photos: galleryData,
  };

  const outPath = resolve(ROOT, 'public', 'gallery-data.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Gallery data written to ${outPath}`);

  // Also upload the JSON to R2
  const jsonBuf = Buffer.from(JSON.stringify(output));
  await uploadToR2('gallery/gallery-data.json', jsonBuf, 'application/json');
  console.log('Gallery data also uploaded to R2');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
