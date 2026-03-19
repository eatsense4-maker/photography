import https from 'https';
import fs from 'fs';

const FB_ALBUMS = [
  { category: 'THE OTHER', set: 'a.642015977370767' },
  { category: 'WEDDING', set: 'a.643719430533755' },
  { category: 'STREET', set: 'a.633787691526929' },
  { category: 'PRESS AND NEWS', set: 'a.642033864035645' },
  { category: 'PORTRAIT', set: 'a.633776798194685' },
  { category: 'NATURE', set: 'a.641741407398224' },
  { category: 'FASHION', set: 'a.633767921528906' }
];

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
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

for (const album of FB_ALBUMS.slice(0, 2)) {
  const url = `https://www.facebook.com/media/set/?set=${album.set}&type=3`;
  console.log(`\n=== Fetching ${album.category}: ${url} ===`);
  try {
    const { status, body } = await fetchRaw(url);
    console.log('Status:', status);
    // Find any image URLs
    const imgs = [...body.matchAll(/https?:\/\/(?:scontent|lookaside)[^"'\s]{10,200}\.(?:jpg|jpeg|png)/gi)].map(m => m[0]);
    console.log('Images found:', imgs.length);
    imgs.slice(0, 5).forEach(i => console.log(' ', i.slice(0, 100)));
    // Save for inspection
    fs.writeFileSync(`tmp_fb_${album.category.replace(/\s+/g,'-').toLowerCase()}.html`, body);
    console.log('Saved HTML, size:', body.length);
  } catch (e) {
    console.log('Error:', e.message);
  }
}
