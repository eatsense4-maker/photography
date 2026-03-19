import https from 'https';
import fs from 'fs';

// Check if modifying stp parameter gives us higher-res images
function fetchSize(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.facebook.com/' } }, res => {
      const size = res.headers['content-length'] ? Number(res.headers['content-length']) : 0;
      resolve({ status: res.statusCode, size, location: res.headers.location });
    });
    req.on('error', reject);
    req.end();
  });
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const opts = { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.facebook.com/' } };
    https.get(url, opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Get a sample CDN URL from the saved HTML  
const html = fs.readFileSync('tmp_fb_the-other.html', 'utf8');
const photoNodeRx = /"node":\{"__typename":"Photo","id":"(\d+)"[^}]*?"image":\{"uri":"([^"]+)"/g;
const nodes = [...html.matchAll(photoNodeRx)];

if (nodes.length === 0) {
  console.log('No photo nodes found');
  process.exit(1);
}

// Take the first URL
const sampleUri = nodes[0][2].replace(/\\\//g, '/');
console.log('Original URL (417px):', sampleUri.slice(0, 120));

// Sizes to try
const sizes = ['s720x720', 's960x960', 's1080x1080', 's1200x1200', 's2048x2048'];
const baseUrl = sampleUri;

// Try removing stp entirely
const noStp = sampleUri.replace(/[?&]stp=[^&]+/, '').replace(/^([^?]+)\?&/, '$1?');
console.log('Without stp:', noStp.slice(0, 120));

for (const size of sizes) {
  const newUrl = sampleUri.replace(/s\d+x\d+/, size);
  if (newUrl === sampleUri) {
    console.log(`Could not replace size in URL`);
    continue;
  }
  try {
    const buf = await downloadBuffer(newUrl);
    console.log(`${size}: ${buf.length} bytes OK`);
    if (buf.length > 50000) {
      fs.writeFileSync(`test_${size}.jpg`, buf);
      console.log(`  → Saved to test_${size}.jpg`);
    }
  } catch(e) {
    console.log(`${size}: ${e.message}`);
  }
}

// Try without stp
try {
  const buf = await downloadBuffer(noStp);
  console.log(`No stp: ${buf.length} bytes OK`);
  if (buf.length > 50000) fs.writeFileSync('test_nostp.jpg', buf);
} catch(e) {
  console.log(`No stp: ${e.message}`);
}
