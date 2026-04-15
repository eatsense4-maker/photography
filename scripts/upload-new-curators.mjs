/**
 * Upload new curator photos to Cloudflare R2.
 *
 * Usage:
 *   1. Save the curator images to this directory:
 *        - albes-fusha.jpg
 *        - blerta-kambo.jpg
 *   2. Run:
 *        node scripts/upload-new-curators.mjs
 *
 * Requires env vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID || '582eb355d10f4b51df7e35e83a56c267'}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY,
  },
});
const BUCKET = 'photoproject';
const R2_PUBLIC = 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev';

const photos = [
  { local: 'albes-fusha.jpg', key: 'curators/albes-fusha.jpg' },
  { local: 'blerta-kambo.jpg', key: 'curators/blerta-kambo.jpg' },
];

for (const p of photos) {
  try {
    await R2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: p.key }));
    console.log(`Already exists: ${R2_PUBLIC}/${p.key}`);
  } catch {
    const filePath = resolve(ROOT, p.local);
    let buf;
    try {
      buf = readFileSync(filePath);
    } catch {
      console.error(`File not found: ${filePath} — please save the image first.`);
      continue;
    }
    await R2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: p.key,
      Body: buf,
      ContentType: 'image/jpeg',
    }));
    console.log(`Uploaded (${buf.length}b): ${R2_PUBLIC}/${p.key}`);
  }
}
console.log('Done.');
