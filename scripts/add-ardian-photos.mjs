import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const R2_ACCOUNT_ID = '582eb355d10f4b51df7e35e83a56c267';
const R2_ACCESS_KEY = 'ee5a183b81069f79d5ca264f15dec15f';
const R2_SECRET_KEY = '163c8b27ce6abef9ac8331db02c06e7ef9a29ec8f4552efc8d27f07a88b2cdb6';
const R2_BUCKET = 'photoproject';

const SUPABASE_URL = 'https://soyuzbszsboltthjlxze.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveXV6YnN6c2JvbHR0aGpseHplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0MjEwMywiZXhwIjoyMDg4MDE4MTAzfQ.Ya--T5krW5m9r4vZfkdup6jjSSHrOCjthDFxP_CA6W8';

const USER_ID   = '43f1e1ec-5624-4ba3-9636-abe5eb262af4';
const EDITION_ID = 'a46b7efd-a8f4-45a0-9250-a806f4c90eb7';

const UPLOADS = [
  {
    file: 'C:\\Users\\albih\\Downloads\\14.jpg.jpeg',
    storageFilename: '14.jpg',
    categoryId: '888d6000-fb75-4459-bfb6-7edc49d844d0',
    categoryName: 'Life Category',
  },
  {
    file: 'C:\\Users\\albih\\Downloads\\01.jpg.jpeg',
    storageFilename: '01.jpg',
    categoryId: 'd7af6cdd-bdef-4357-bc67-25fe730c2d54',
    categoryName: 'Land Category',
  },
];

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function processUpload({ file, storageFilename, categoryId, categoryName }) {
  console.log(`\n── ${categoryName} ──`);

  // 1. Upload to R2
  const fileBuffer = readFileSync(file);
  const storageKey = `submissions/${randomUUID()}-${storageFilename}`;
  console.log(`  Uploading to R2: ${storageKey}`);
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: storageKey,
    Body: fileBuffer,
    ContentType: 'image/jpeg',
  }));
  console.log('  R2 upload OK');

  // 2. Create submission
  const { data: sub, error: subErr } = await supabase
    .from('submissions')
    .insert({
      user_id: USER_ID,
      edition_id: EDITION_ID,
      category_id: categoryId,
      status: 'accepted',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (subErr) throw new Error(`Submission insert failed: ${subErr.message}`);
  console.log(`  Submission created: ${sub.id}`);

  // 3. Create submission_photos record
  const { error: photoErr } = await supabase
    .from('submission_photos')
    .insert({
      submission_id: sub.id,
      storage_key: storageKey,
      original_filename: storageFilename,
      mime_type: 'image/jpeg',
      file_size: fileBuffer.length,
      sort_order: 0,
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    });
  if (photoErr) throw new Error(`Photo insert failed: ${photoErr.message}`);
  console.log('  Photo record created (status: approved)');
}

(async () => {
  for (const upload of UPLOADS) {
    await processUpload(upload);
  }
  console.log('\nDone! Both photos are live and visible to jury.');
})();
