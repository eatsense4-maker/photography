import fs from 'fs';

const html = fs.readFileSync('tmp_kuratore.html', 'utf8');

// H2/H3 headings
const headings = [...html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)]
  .map(m => m[1].replace(/<[^>]+>/g,' ').trim())
  .filter(h => h.length > 2);
console.log('Headings:\n', headings.slice(0,40).join('\n'));

// WP images
const wpImgs = [...html.matchAll(/src="(https?:\/\/www\.fokusaward\.com\/wp-content\/uploads\/[^"]+)"/gi)]
  .map(m => m[1]);
const uniq = [...new Set(wpImgs)];
console.log('\nWP images:');
uniq.forEach(i => console.log(' ', i));

// paragraph text after each heading
const chunks = html.split(/<h[23][^>]*>/i);
console.log('\n--- First 3 chunks preview ---');
chunks.slice(1,4).forEach((c,i) => {
  const name = (c.match(/^([\s\S]*?)<\/h[23]>/i)||[])[1]?.replace(/<[^>]+>/g,'').trim();
  const paras = [...c.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>m[1].replace(/<[^>]+>/g,'').trim()).filter(Boolean);
  console.log(`\n[${i}] ${name}`);
  paras.slice(0,3).forEach(p => console.log('  ',p.slice(0,150)));
});
