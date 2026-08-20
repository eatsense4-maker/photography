import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const R2_ACCOUNT_ID = '582eb355d10f4b51df7e35e83a56c267';
const R2_ACCESS_KEY = 'ee5a183b81069f79d5ca264f15dec15f';
const R2_SECRET_KEY = '163c8b27ce6abef9ac8331db02c06e7ef9a29ec8f4552efc8d27f07a88b2cdb6';
const R2_BUCKET = 'photoproject';

const SUPABASE_URL = 'https://soyuzbszsboltthjlxze.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveXV6YnN6c2JvbHR0aGpseHplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0MjEwMywiZXhwIjoyMDg4MDE4MTAzfQ.Ya--T5krW5m9r4vZfkdup6jjSSHrOCjthDFxP_CA6W8';

const STORAGE_KEY = 'submissions/61725531-cc9e-41d7-8374-d2ab32ea381a-A_Shared_Breath.jpg';
const PHOTO_PATH = 'C:\\Users\\albih\\Downloads\\A Shared Breath.jpg';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const fileBuffer = readFileSync(PHOTO_PATH);

  // 1. Upload to R2
  console.log(`Uploading to R2: ${STORAGE_KEY}`);
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: STORAGE_KEY,
    Body: fileBuffer,
    ContentType: 'image/jpeg',
  }));
  console.log('Uploaded to R2 successfully.');

  // 2. Delete from Supabase storage
  console.log('Removing from Supabase storage...');
  const { error } = await supabase.storage.from('submissions').remove([STORAGE_KEY]);
  if (error) {
    console.warn('Supabase storage removal warning:', error.message);
  } else {
    console.log('Removed from Supabase storage.');
  }

  console.log('Done! Photo is now on R2.');
}

main();
