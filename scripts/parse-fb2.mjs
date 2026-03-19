import fs from 'fs';

const html = fs.readFileSync('tmp_fb_the-other.html', 'utf8');

// Facebook stores images as JSON-encoded strings in script tags
// Look for the typical "image" objects in the server-side rendered JSON
const fbcdnUrls = [];

// Pattern: escaped JSON URLs
const patterns = [
  html.matchAll(/https:\\\/\\\/scontent[^"\\]{20,300}/g),
  html.matchAll(/https:\\u002F\\u002Fscontent[^"\\]{20,300}/g),
  html.matchAll(/"uri":"(https:\/\/scontent[^"]{20,300})"/g),
];

for (const iter of patterns) {
  for (const m of iter) {
    const url = (m[1] || m[0]).replace(/\\\/\//g, '/').replace(/\\\//g, '/').replace(/\\u002F/gi, '/');
    if (url.includes('jpg') || url.includes('jpeg') || url.includes('png') || url.includes('_n.')) {
      fbcdnUrls.push(url);
    }
  }
}

console.log('Found URLs:', fbcdnUrls.length);
[...new Set(fbcdnUrls.map(u => u.trim()))].slice(0, 20).forEach(u => console.log(u.slice(0, 200)));

// Also find alt text / captions
const captions = [...html.matchAll(/"label":"([^"]{5,200})"/g)].map(m => m[1]).filter(c => !c.includes('No photo'));
console.log('\nLabels:', captions.length);
captions.slice(0, 10).forEach(c => console.log(' ', c));

// Look for JS data structures with photo_ids and image URLs
const photoBlocks = [...html.matchAll(/"node":\{"__typename":"Photo",[^}]{50,500}/g)].map(m => m[0]);
console.log('\nPhoto node blocks:', photoBlocks.length);
photoBlocks.slice(0, 3).forEach(b => console.log(b.slice(0, 300)));
