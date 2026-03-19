import fs from 'fs';

const html = fs.readFileSync('tmp_kuratore.html', 'utf8');

// Find all WP upload images with surrounding context
const curatorImgs = [
  'Albes-Fusha2.jpg',
  'arben-alliaj.jpg',
  'Burim-Myftiu',
  'SAIMIR-AHMETI',
  'Elton-Koritari',
  'osman-demiri',
  '283913859_549239830122775',
];

for (const img of curatorImgs) {
  const idx = html.indexOf(img);
  if (idx < 0) { console.log(`NOT FOUND: ${img}`); continue; }
  // Grab 2500 chars around the image
  const snippet = html.slice(Math.max(0, idx - 500), idx + 2000);
  // Strip tags lightly and show
  const text = snippet.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  console.log(`\n=== ${img} ===`);
  console.log(text.slice(0, 600));
}
