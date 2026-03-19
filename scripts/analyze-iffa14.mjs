import fs from 'fs';

const html = fs.readFileSync('tmp_iffa14.html', 'utf8');

const sections = [
  { name: 'Things Have Changed', start: 81721, end: 87352 },
  { name: 'PRESS', start: 87352, end: 91716 },
  { name: 'PEOPLE', start: 91716, end: 96076 },
  { name: 'LAND', start: 96076, end: 100425 },
  { name: 'LIFE', start: 100425, end: 104770 },
  { name: 'JURY', start: 104770, end: 119544 }
];

for (const section of sections) {
  const chunk = html.slice(section.start, section.end);
  const rawImgs = [...chunk.matchAll(/uploads\/2023\/[^"']+\.(jpg|jpeg|png)/gi)].map(m => m[0]);
  const imgs = [...new Set(rawImgs.map(u => {
    const f = u.split('/').pop();
    return f.replace(/-\d+x\d+(\.(jpg|jpeg|png))$/, '$1');
  }))];
  const fbAlbums = [...new Set([...chunk.matchAll(/media\/set\/\?set=(a\.\d+)/g)].map(m => m[1]))];
  console.log('\n== ' + section.name + ' ==');
  console.log('Photos:', imgs.join(', '));
  if (fbAlbums.length) console.log('FB Albums:', fbAlbums.join(', '));
}

// Also check if there's participant section heading pattern like in edition 13
const participantSections = [...html.matchAll(/PARTICIPI[^<]{0,50}/gi)].map(m => ({ pos: m.index, txt: m[0] }));
console.log('\nParticipant sections:', participantSections.length);

// Look for alt text on 2023 photos to find photographer names
console.log('\n=== ALL 2023 IMG ALT+SRC PAIRS ===');
const pairs = [...html.matchAll(/<img[^>]+>/gi)].map(m => {
  const tag = m[0];
  const src = (tag.match(/src="([^"]+)"/i) || [])[1] || '';
  const alt = (tag.match(/alt="([^"]+)"/i) || [])[1] || '';
  return { src, alt };
}).filter(p => p.src.includes('wp-content/uploads/2023'));
pairs.forEach(p => {
  const file = p.src.split('/').pop().replace(/-\d+x\d+(\.(jpg|jpeg|png))$/, '$1');
  if (file) console.log(file, '|', p.alt);
});
