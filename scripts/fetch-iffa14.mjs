import https from 'https';
import fs from 'fs';

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchRaw(res.headers.location).then(resolve).catch(reject);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

const html = await fetchRaw('https://www.fokusaward.com/en/edicioni-i-14-te-2023/');
fs.writeFileSync('G:/project web/photography/tmp_iffa14.html', html);
console.log('HTML size:', html.length);

// Find headings
const headings = [...html.matchAll(/heading-block[^>]*>([\s\S]{0,500})/gi)];
headings.forEach(m => {
  const txt = m[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g,' ').slice(0,180);
  if (/winner|category|particip|jury|other|wedding|street|press|portrait|nature|fashion|people|land|life|sport|culture|cambio|changed/i.test(txt)) {
    console.log('POS', m.index, txt.trim());
  }
});

// WP images
const wpImgs = [...new Set([...html.matchAll(/https:\/\/www\.fokusaward\.com\/wp-content\/uploads[^"'\s]+\.(?:jpg|jpeg|png)/gi)].map(m => m[0]))];
console.log('\nWP images:', wpImgs.length);
wpImgs.filter(u => u.includes('2023')).forEach(u => console.log(' ', u.split('/').slice(-1)[0]));

// Facebook albums
const fbAlbums = [...new Set([...html.matchAll(/facebook\.com\/media\/set\/\?set=([^"'&\s<]+)/gi)].map(m => m[1]))];
console.log('\nFacebook albums:', fbAlbums.length);
fbAlbums.forEach(a => console.log(' ', a));

// All iframes
const iframes = [...html.matchAll(/<iframe[^>]+src="([^"]+)"/gi)].map(m => m[1]);
console.log('\nIframes:', iframes.length);
iframes.slice(0,10).forEach(f => console.log(' ', f.slice(0,100)));
