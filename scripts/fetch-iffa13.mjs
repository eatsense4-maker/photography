import https from 'https';
import fs from 'fs';

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchRaw(res.headers.location).then(resolve).catch(reject);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

const html = await fetchRaw('https://www.fokusaward.com/en/edicioni-i-13-te-2022/');
fs.writeFileSync('G:/project web/photography/tmp_iffa13.html', html);
console.log('HTML size:', html.length);

// Find iframes
const iframes = [...html.matchAll(/<iframe[^>]+>/gi)].map(m => m[0].slice(0, 300));
console.log('\n=== IFRAMES ===', iframes.length);
iframes.forEach(f => console.log(f));

// Facebook references
const fbUrls = [...html.matchAll(/https?:\/\/(?:www\.)?facebook\.com[^\s"'<>]{3,200}/gi)].map(m => m[0]);
console.log('\n=== FACEBOOK URLs ===', fbUrls.length);
[...new Set(fbUrls)].forEach(u => console.log(u));

// All wp-content images
const wpImgs = [...new Set([...html.matchAll(/https:\/\/www\.fokusaward\.com\/wp-content\/uploads[^"'\s]+\.(?:jpg|jpeg|png)/gi)].map(m => m[0]))];
console.log('\n=== WP IMAGES ===', wpImgs.length);
wpImgs.forEach(u => console.log(u));

// Look for participant section HTML
const participantIdx = html.toLowerCase().indexOf('participi');
if (participantIdx >= 0) {
  console.log('\n=== PARTICIPANTS SECTION (500 chars) ===');
  console.log(html.slice(participantIdx - 50, participantIdx + 500));
}
