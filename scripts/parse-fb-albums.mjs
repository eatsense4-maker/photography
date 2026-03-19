import https from 'https';
import fs from 'fs';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://582eb355d10f4b51df7e35e83a56c267.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  }
});
const BUCKET = 'photoproject';
const R2_PUBLIC = 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev';

const FB_ALBUMS = [
  { category: 'THE OTHER', slug: 'the-other', set: 'a.642015977370767' },
  { category: 'WEDDING', slug: 'wedding', set: 'a.643719430533755' },
  { category: 'STREET', slug: 'street', set: 'a.633787691526929' },
  { category: 'PRESS AND NEWS', slug: 'press-and-news', set: 'a.642033864035645' },
  { category: 'PORTRAIT', slug: 'portrait', set: 'a.633776798194685' },
  { category: 'NATURE', slug: 'nature', set: 'a.641741407398224' },
  { category: 'FASHION', slug: 'fashion', set: 'a.633767921528906' },
];

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    };
    https.get(url, opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchRaw(res.headers.location).then(resolve).catch(reject);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const opts = { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.facebook.com/' } };
    https.get(url, opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buf: Buffer.concat(chunks), ct: res.headers['content-type'] }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function parseAlbum(html, category) {
  // Look for JSON-LD or meta og:image tags or specific FB data structures
  // Facebook embeds photo URLs in JSON-like structures
  
  // Method 1: Look for og:image type patterns in the large HTML
  const ogImgs = [...html.matchAll(/"og:image","content":"(https:\\\/\\\/scontent[^"]+)"/g)].map(m => m[1].replace(/\\\//g, '/'));
  
  // Method 2: Look for CDN image URLs in various resolutions  
  // t39.30808-6 = full-size photos
  // t39.30808-1 = profile photos (skip)
  const contentImgs = [...new Set(
    [...html.matchAll(/"(https:\\\/\\\/scontent\.[^"]+\/v\/t39\.30808-6\/[^"]+)"/g)]
      .map(m => m[1].replace(/\\\//g, '/').replace(/\\u0025/g, '%'))
      .filter(u => !u.includes('t39.30808-1'))
  )];

  // Method 3: Look for specific photo permalink patterns
  const photoLinks = [...html.matchAll(/("\/photo\/(\d+)\/?"|"photo_id":"(\d+)")/g)].map(m => m[2] || m[3]).filter(Boolean);
  const uniquePhotoIds = [...new Set(photoLinks)];
  
  // Method 4: Look for aria-label or similar with photographer info
  const captions = [...html.matchAll(/"accessibility_caption":"([^"]+)"/g)].map(m => m[1]);
  
  console.log(`\n[${category}]`);
  console.log('  og:image URLs:', ogImgs.length);
  console.log('  t39.30808-6 CDN URLs:', contentImgs.length);
  console.log('  Photo IDs:', uniquePhotoIds.length, uniquePhotoIds.slice(0, 5).join(', '));
  console.log('  Captions:', captions.length, captions.slice(0, 3).map(c => c.slice(0, 80)));
  
  if (contentImgs.length > 0) {
    console.log('  Sample CDN URLs:');
    contentImgs.slice(0, 5).forEach(u => console.log('   ', u.slice(0, 120)));
  }
  
  return { contentImgs, uniquePhotoIds, captions };
}

console.log('Analyzing saved Facebook album HTMLs...\n');

// Check already-saved files
for (const album of FB_ALBUMS) {
  const fname = `tmp_fb_${album.slug}.html`;
  if (fs.existsSync(fname)) {
    const html = fs.readFileSync(fname, 'utf8');
    await parseAlbum(html, album.category);
  } else {
    console.log(`[${album.category}] Not fetched yet, fetching...`);
    const { body } = await fetchRaw(`https://www.facebook.com/media/set/?set=${album.set}&type=3`);
    fs.writeFileSync(fname, body);
    await parseAlbum(body, album.category);
  }
}
