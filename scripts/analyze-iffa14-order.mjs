import fs from 'fs';

const html = fs.readFileSync('tmp_iffa14.html', 'utf8');

const sections = [
  { name: 'Things Have Changed', start: 81721, end: 87352 },
  { name: 'PRESS', start: 87352, end: 91716 },
  { name: 'PEOPLE', start: 91716, end: 96076 },
  { name: 'LAND', start: 96076, end: 100425 },
  { name: 'LIFE', start: 100425, end: 104770 },
];

for (const s of sections) {
  const chunk = html.slice(s.start, s.end);
  const imgs = [...chunk.matchAll(/src="(https:\/\/www\.fokusaward\.com\/wp-content\/uploads\/2023\/[^"]+\.(jpg|jpeg|png))"/gi)].map(m => {
    const f = m[1].split('/').pop();
    return f.replace(/-\d+x\d+\.(jpg|jpeg|png)$/, (_, ext) => ext);
  });
  const unique = [...new Set(imgs)];
  console.log('[' + s.name + '] order:', unique.join(' → '));
}
