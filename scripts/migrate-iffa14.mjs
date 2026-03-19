import https from 'https';
import fs from 'fs';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  }
});
const BUCKET = 'photoproject';
const R2_PUBLIC = 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev';

const FB_ALBUMS = [
  { category: 'Things Have Changed', slug: 'things-have-changed', set: 'a.907135044192191' },
  { category: 'PRESS', slug: 'press', set: 'a.907133110859051' },
  { category: 'PEOPLE', slug: 'people', set: 'a.907131530859209' },
  { category: 'LAND', slug: 'land', set: 'a.907122024193493' },
  { category: 'LIFE', slug: 'life', set: 'a.908725034033192' },
];

const WINNERS = {
  'Things Have Changed': [
    { file: 'main-first-place-2023.jpeg',  place: 1 },
    { file: 'main-second-place-2023.jpeg', place: 2 },
    { file: 'main-third-place-2023.jpeg',  place: 3 },
  ],
  'PRESS': [
    { file: 'PRESS1_1.jpeg',    place: 1 },
    { file: 'PRESS1.jpeg',      place: 2 },
    { file: 'PRESS32023.jpeg',  place: 3 },
  ],
  'PEOPLE': [
    { file: 'PEOPLE1.jpeg', place: 1 },
    { file: 'PEOPLE2.jpeg', place: 2 },
    { file: 'PEOPLE3.jpeg', place: 3 },
  ],
  'LAND': [
    { file: 'LANDWIN.jpeg', place: 1 },
    { file: 'LAND1.jpeg',   place: 2 },
    { file: 'LAND3.jpeg',   place: 3 },
  ],
  'LIFE': [
    { file: 'LIFE1.jpeg', place: 1 },
    { file: 'LIFE2.jpeg', place: 2 },
    { file: 'LIFE3.jpeg', place: 3 },
  ],
};

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
      res.on('end', () => resolve({ buf: Buffer.concat(chunks), ct: res.headers['content-type'] || 'image/jpeg' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractPhotos(html) {
  const photos = [];
  const photoNodeRx = /"node":\{"__typename":"Photo","id":"(\d+)"[^}]*?"image":\{"uri":"([^"]+)"/g;
  for (const m of html.matchAll(photoNodeRx)) {
    const id = m[1];
    const uri = m[2].replace(/\\\//g, '/');
    const size = (uri.match(/s(\d+)x(\d+)/) || [])[1] || '417';
    photos.push({ id, uri, thumbnailSize: Number(size) });
  }
  const byId = {};
  for (const p of photos) {
    if (!byId[p.id] || byId[p.id].thumbnailSize < p.thumbnailSize) byId[p.id] = p;
  }
  return Object.values(byId);
}

// ── Step 1: Fetch all FB albums ──────────────────────────────────
console.log('=== Fetching Facebook participant albums ===\n');
const fbResults = {};

for (const album of FB_ALBUMS) {
  console.log(`Fetching ${album.category} (${album.set})...`);
  const { body } = await fetchRaw(`https://www.facebook.com/media/set/?set=${album.set}&type=3`);
  fs.writeFileSync(`tmp_fb14_${album.slug}.html`, body);
  const photos = extractPhotos(body);
  console.log(`  Found ${photos.length} photos`);
  fbResults[album.category] = photos;
  await new Promise(r => setTimeout(r, 500));
}

// ── Step 2: Upload participant photos to R2 ──────────────────────
console.log('\n=== Uploading participant photos to R2 ===\n');
const uploadedParticipants = {};
let totalUploaded = 0;

for (const [category, photos] of Object.entries(fbResults)) {
  const slug = FB_ALBUMS.find(a => a.category === category).slug;
  const albumPhotos = [];
  
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const r2Key = `gallery/2023/participants/${slug}/${p.id}.jpg`;
    const publicUrl = `${R2_PUBLIC}/${r2Key}`;
    
    try {
      await R2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: r2Key }));
      process.stdout.write(`  [${category}][${i+1}/${photos.length}] Exists: ${p.id}\n`);
      albumPhotos.push({ r2Key, url: publicUrl });
      continue;
    } catch {}

    try {
      const { buf, ct } = await downloadBuffer(p.uri);
      if (buf.length < 1000) {
        process.stdout.write(`  [${category}][${i+1}/${photos.length}] SKIP (too small)\n`);
        continue;
      }
      await R2.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: r2Key,
        Body: buf,
        ContentType: ct.includes('image') ? ct : 'image/jpeg'
      }));
      process.stdout.write(`  [${category}][${i+1}/${photos.length}] Uploaded: ${p.id} (${buf.length}b)\n`);
      albumPhotos.push({ r2Key, url: publicUrl });
      totalUploaded++;
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      process.stdout.write(`  [${category}][${i+1}/${photos.length}] ERROR: ${e.message}\n`);
    }
  }
  
  uploadedParticipants[category] = albumPhotos;
}

// ── Step 3: Update gallery-data.json ────────────────────────────
console.log('\n=== Updating gallery-data.json ===');
const YEAR = 2023;
const EDITION_NUM = 14;
const data = JSON.parse(fs.readFileSync('public/gallery-data.json', 'utf8'));
const edition = data.editions.find(e => e.year === YEAR);

// Flag jury photo
const juryPhoto = data.photos.find(p => p.r2Key === 'gallery/2023/bd774c7e-7e7f-4ff3-99ae-d6581c25d392.jpg');
if (juryPhoto) {
  juryPhoto.isWinner = false;
  juryPhoto.isJury = true;
  juryPhoto.photographer = null;
  console.log('Flagged jury photo');
}

// Remove old competition photos
const old = data.photos.filter(p => p.edition === EDITION_NUM && !p.isJury);
console.log(`Removing ${old.length} old competition photos`);
data.photos = data.photos.filter(p => p.edition !== EDITION_NUM || p.isJury === true);

// Rebuild
let added = 0;
for (const [category, winners] of Object.entries(WINNERS)) {
  for (const w of winners) {
    const r2Key = `gallery/${YEAR}/${w.file}`;
    data.photos.push({
      r2Key,
      url: `${R2_PUBLIC}/${r2Key}`,
      category,
      isWinner: true,
      place: w.place,
      title: null,
      photographer: null,
      edition: EDITION_NUM,
      year: YEAR,
    });
    added++;
  }
  for (const p of (uploadedParticipants[category] || [])) {
    data.photos.push({
      r2Key: p.r2Key,
      url: p.url,
      category,
      isWinner: false,
      place: null,
      title: null,
      photographer: null,
      edition: EDITION_NUM,
      year: YEAR,
    });
    added++;
  }
}

edition.categories = Object.keys(WINNERS);
edition.mainCategory = 'Things Have Changed';

edition.photoCount = data.photos.filter(p => p.edition === EDITION_NUM).length;

fs.writeFileSync('public/gallery-data.json', JSON.stringify(data, null, 2));
console.log(`Done. Added ${added} photos. Edition 14 now has ${edition.photoCount} total.`);
console.log(`Uploaded ${totalUploaded} new participant photos.`);
console.log('Categories:', edition.categories);
const finalWinners = data.photos.filter(p => p.edition === EDITION_NUM && p.isWinner);
const finalParts = data.photos.filter(p => p.edition === EDITION_NUM && !p.isWinner && !p.isJury);
console.log(`Final: ${finalWinners.length} winners, ${finalParts.length} participants`);
