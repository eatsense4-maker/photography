const fs = require('fs');
const file = 'G:/project web/photography/src/pages/public/HomePage.tsx';
const b = fs.readFileSync(file);
const s = b.toString('utf8');
const lines = s.split('\n');

// Show codepoints around the dash in line 21
const l = lines[20]; // 0-indexed
const dStart = l.indexOf('moments ') + 8;
const chars = [...l.slice(dStart, dStart + 10)];
console.log('Line 21 mojibake chars:');
chars.forEach((c, i) => {
  console.log(`  [${i}] U+${c.codePointAt(0).toString(16).padStart(4, '0')} = ${c} (${c.codePointAt(0)})`);
});

// Also check near FRYM
const frymLine = lines.findIndex(l => l.includes('FRYM'));
if (frymLine >= 0) {
  const fl = lines[frymLine];
  const fi = fl.indexOf('FRYM');
  const fchars = [...fl.slice(fi, fi + 10)];
  console.log(`\nLine ${frymLine + 1} FRYM chars:`);
  fchars.forEach((c, i) => {
    console.log(`  [${i}] U+${c.codePointAt(0).toString(16).padStart(4, '0')} = ${c} (${c.codePointAt(0)})`);
  });
}
