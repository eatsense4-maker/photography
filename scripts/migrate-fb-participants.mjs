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
  { category: 'THE OTHER', slug: 'the-other', set: 'a.642015977370767' },
  { category: 'WEDDING', slug: 'wedding', set: 'a.643719430533755' },
  { category: 'STREET', slug: 'street', set: 'a.633787691526929' },
  { category: 'PRESS AND NEWS', slug: 'press-and-news', set: 'a.642033864035645' },
  { category: 'PORTRAIT', slug: 'portrait', set: 'a.633776798194685' },
  { category: 'NATURE', slug: 'nature', set: 'a.641741407398224' },
  { category: 'FASHION', slug: 'fashion', set: 'a.633767921528906' },
];

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const opts = { 
      headers: { 
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.facebook.com/'
      } 
    };
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
  // Extract photo node data from Facebook's inline JSON
  const photos = [];
  
  // Pattern: "node":{"__typename":"Photo","id":"XXX","__isMedia":"Photo","image":{"uri":"URL",...
  const photoNodeRx = /"node":\{"__typename":"Photo","id":"(\d+)"[^}]*?"image":\{"uri":"([^"]+)"/g;
  for (const m of html.matchAll(photoNodeRx)) {
    const id = m[1];
    const uri = m[2].replace(/\\\//g, '/');
    
    // Try to get a larger version - strip size constraints
    // Original: ?stp=dst-jpg_s417x417_tt6&...
    // We'll try to remove size restriction
    const urlBase = uri.replace(/\?.*/, '');
    const size = (uri.match(/s(\d+)x(\d+)/) || [])[1] || '417';
    
    photos.push({ id, uri, urlBase, thumbnailSize: Number(size) });
  }
  
  // Deduplicate by photo ID, keep the largest available
  const byId = {};
  for (const p of photos) {
    if (!byId[p.id] || byId[p.id].thumbnailSize < p.thumbnailSize) {
      byId[p.id] = p;
    }
  }
  
  return Object.values(byId);
}

async function uploadToR2(buf, key, ct) {
  try {
    await R2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return 'exists';
  } catch {
    await R2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf, ContentType: ct }));
    return 'uploaded';
  }
}

const results = {};
let totalUploaded = 0;

for (const album of FB_ALBUMS) {
  const fname = `tmp_fb_${album.slug}.html`;
  const html = fs.readFileSync(fname, 'utf8');
  const photos = extractPhotos(html);
  
  console.log(`\n[${album.category}]: ${photos.length} photos found in album`);
  
  const albumPhotos = [];
  
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    // Use a meaningful filename
    const r2Key = `gallery/2022/participants/${album.slug}/${p.id}.jpg`;
    const publicUrl = `${R2_PUBLIC}/${r2Key}`;
    
    // Check if already exists
    try {
      await R2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: r2Key }));
      console.log(`  [${i+1}/${photos.length}] Exists: ${p.id}`);
      albumPhotos.push({ r2Key, url: publicUrl, fbPhotoId: p.id });
      continue;
    } catch {}
    
    // Download the thumbnail image (417x417 or whatever is available)
    try {
      const { buf, ct } = await downloadBuffer(p.uri);
      if (buf.length < 1000) {
        console.log(`  [${i+1}/${photos.length}] SKIP (too small ${buf.length}b): ${p.id}`);
        continue;
      }
      await R2.send(new PutObjectCommand({ 
        Bucket: BUCKET, 
        Key: r2Key, 
        Body: buf, 
        ContentType: ct.includes('image') ? ct : 'image/jpeg'
      }));
      console.log(`  [${i+1}/${photos.length}] Uploaded: ${p.id} (${buf.length} bytes)`);
      albumPhotos.push({ r2Key, url: publicUrl, fbPhotoId: p.id });
      totalUploaded++;
      
      // Small delay to be respectful
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.log(`  [${i+1}/${photos.length}] ERROR: ${p.id}: ${e.message}`);
    }
  }
  
  results[album.category] = albumPhotos;
}

// Save results
fs.writeFileSync('tmp_fb_results.json', JSON.stringify(results, null, 2));
console.log(`\nDone! Uploaded ${totalUploaded} new photos. Results saved to tmp_fb_results.json`);
console.log('Album photo counts:');
for (const [cat, photos] of Object.entries(results)) {
  console.log(`  ${cat}: ${photos.length} photos`);
}
