import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const R2_ACCOUNT_ID = '582eb355d10f4b51df7e35e83a56c267';
const R2_ACCESS_KEY = 'ee5a183b81069f79d5ca264f15dec15f';
const R2_SECRET_KEY = '163c8b27ce6abef9ac8331db02c06e7ef9a29ec8f4552efc8d27f07a88b2cdb6';
const R2_BUCKET = 'photoproject';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

const file = 'C:\\Users\\albih\\Downloads\\01.jpg.jpeg';
const storageKey = `submissions/${randomUUID()}-01.jpg`;

const buf = readFileSync(file);
await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: storageKey, Body: buf, ContentType: 'image/jpeg' }));
console.log(storageKey);
