import fs from 'fs';

const html = fs.readFileSync('tmp_iffa13.html', 'utf8');

const sections = [
  { name: 'THE OTHER', start: 81128, end: 86649 },
  { name: 'WEDDING', start: 86649, end: 91586 },
  { name: 'STREET', start: 91586, end: 96322 },
  { name: 'PRESS AND NEWS', start: 96322, end: 101180 },
  { name: 'PORTRAIT', start: 101180, end: 105962 },
  { name: 'NATURE', start: 105962, end: 110756 },
  { name: 'FASHION', start: 110756, end: 115513 },
  { name: 'JURY', start: 115513, end: 130260 }
];

for (const section of sections) {
  const chunk = html.slice(section.start, section.end);
  const imgs = [...chunk.matchAll(/uploads\/2022\/[^"']+\.(jpg|png|jpeg)/gi)].map(m => m[0].split('/').pop());
  const uniqueImgs = [...new Set(imgs.filter(i => !i.includes('x468') && !i.includes('x100') && !i.includes('x300')))];
  const fbMatches = [...chunk.matchAll(/media\/set\/\?set=a\.(\d+)/g)].map(m => 'a.' + m[1]);
  const fbFull = [...chunk.matchAll(/facebook\.com\/media\/set\/\?set=([^"'&\s]+)/g)].map(m => m[1]);

  console.log('\n== ' + section.name + ' ==');
  console.log('Photos:', uniqueImgs.join(', '));
  if (fbFull.length) console.log('FB Albums:', [...new Set(fbFull)].join(', '));
}

// Extract alt text and src pairs
console.log('\n\n=== ALL IMG ALT+SRC PAIRS ===');
const pairs = [...html.matchAll(/<img[^>]+>/gi)].map(m => {
  const tag = m[0];
  const src = (tag.match(/src="([^"]+)"/i) || [])[1] || '';
  const alt = (tag.match(/alt="([^"]+)"/i) || [])[1] || '';
  return { src, alt };
}).filter(p => p.src.includes('wp-content/uploads/2022/09'));

pairs.forEach(p => {
  const file = p.src.split('/').pop();
  if (file) console.log(file, '|', p.alt);
});
