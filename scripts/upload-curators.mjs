import https from 'https';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});
const BUCKET = 'photoproject';
const R2_PUBLIC = 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev';

const photos = [
  { url: 'https://www.fokusaward.com/wp-content/uploads/2022/05/arben-alliaj.jpg', key: 'curators/arben-alliaj.jpg' },
  { url: 'https://www.fokusaward.com/wp-content/uploads/2022/05/Burim-Myftiu-867x1024.jpg', key: 'curators/burim-myftiu.jpg' },
  { url: 'https://www.fokusaward.com/wp-content/uploads/2022/05/SAIMIR-AHMETI-300x300.jpg', key: 'curators/saimir-ahmeti.jpg' },
  { url: 'https://www.fokusaward.com/wp-content/uploads/2022/05/Elton-Koritari-1024x1024.jpg', key: 'curators/elton-koritari.jpg' },
  { url: 'https://www.fokusaward.com/wp-content/uploads/2022/05/osman-demiri-1024x1024.jpg', key: 'curators/osman-demiri.jpg' },
  { url: 'https://www.fokusaward.com/wp-content/uploads/2022/05/283913859_549239830122775_791061640202898114_n.jpg', key: 'curators/vlora-demiri.jpg' },
];

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.fokusaward.com/' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return download(res.headers.location).then(resolve).catch(reject);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

for (const p of photos) {
  try {
    await R2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: p.key }));
    console.log(`Exists: ${p.key}`);
  } catch {
    const buf = await download(p.url);
    await R2.send(new PutObjectCommand({ Bucket: BUCKET, Key: p.key, Body: buf, ContentType: 'image/jpeg' }));
    console.log(`Uploaded (${buf.length}b): ${R2_PUBLIC}/${p.key}`);
  }
}
console.log('Done.');
