const fs = require('fs');
const file = 'G:/project web/photography/src/pages/public/HomePage.tsx';
const s = fs.readFileSync(file, 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.includes('\u00e2')) {
    const idx = l.indexOf('\u00e2');
    const chars = [...l.slice(idx, idx + 5)];
    console.log(`Line ${i + 1}: ...${l.slice(Math.max(0, idx - 10), idx + 15)}...`);
    chars.forEach((c, j) => {
      console.log(`  [${j}] U+${c.codePointAt(0).toString(16).padStart(4, '0')} (${c.codePointAt(0)})`);
    });
  }
});
