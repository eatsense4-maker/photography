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

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
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

// Get sample photo IDs from our gallery-data
const data = JSON.parse(fs.readFileSync('public/gallery-data.json', 'utf8'));
const participants = data.photos
  .filter(p => p.edition === 13 && !p.isWinner && !p.isJury && p.r2Key.includes('/participants/'));

console.log(`Total participants to upgrade: ${participants.length}`);

let upgraded = 0;
let failed = 0;
let skipped = 0;

for (let i = 0; i < participants.length; i++) {
  const p = participants[i];
  const photoId = p.r2Key.split('/').pop().replace('.jpg', '');
  const photoUrl = `https://www.facebook.com/photo/?fbid=${photoId}`;
  
  process.stdout.write(`[${i+1}/${participants.length}] ${photoId}: `);
  
  try {
    const { status, body } = await fetchRaw(photoUrl);
    
    // Find og:image meta tag for full-size URL
    const ogMatch = body.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
                 || body.match(/content="(https:\/\/scontent[^"]+)"[^>]+property="og:image"/i);
    
    if (!ogMatch) {
      // Try another pattern
      const srcMatch = body.match(/"uri":"(https:\\\/\\\/scontent[^"]{20,400})","width":\d+,"height":\d+/);
      if (srcMatch) {
        const fullUrl = srcMatch[1].replace(/\\\//g, '/');
        const sizeMatch = fullUrl.match(/s(\d+)x(\d+)/);
        const w = sizeMatch ? Number(sizeMatch[1]) : 0;
        if (w >= 720) {
          const { buf, ct } = await downloadBuffer(fullUrl);
          if (buf.length > 30000) {
            await R2.send(new PutObjectCommand({ Bucket: BUCKET, Key: p.r2Key, Body: buf, ContentType: 'image/jpeg' }));
            console.log(`upgraded ${buf.length}b (${w}px wide) via uri`);
            upgraded++;
            await new Promise(r => setTimeout(r, 300));
            continue;
          }
        }
      }
      console.log('no og:image found');
      failed++;
      continue;
    }
    
    let fullUrl = ogMatch[1].replace(/&amp;/g, '&');
    // The OGP image is typically the full-size version
    const { buf, ct } = await downloadBuffer(fullUrl);
    
    if (buf.length > 30000) {
      await R2.send(new PutObjectCommand({ Bucket: BUCKET, Key: p.r2Key, Body: buf, ContentType: 'image/jpeg' }));
      console.log(`upgraded to ${buf.length}b`);
      upgraded++;
    } else {
      console.log(`small (${buf.length}b), skipped`);
      skipped++;
    }
    
    await new Promise(r => setTimeout(r, 300));
  } catch (e) {
    console.log(`error: ${e.message}`);
    failed++;
  }
}

console.log(`\nDone: ${upgraded} upgraded, ${failed} failed, ${skipped} skipped (too small)`);
