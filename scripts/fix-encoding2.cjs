const fs = require('fs');
const file = 'G:/project web/photography/src/pages/public/HomePage.tsx';
let s = fs.readFileSync(file, 'utf8');

// â€" (U+00E2 U+20AC U+201D) -> — (em dash, U+2014)
s = s.replaceAll('\u00e2\u20ac\u201d', '\u2014');

// â€" (U+00E2 U+20AC U+201C) -> – (en dash, U+2013)
s = s.replaceAll('\u00e2\u20ac\u201c', '\u2013');

// â€™ (U+00E2 U+20AC U+2122) -> ' (right single quote, U+2019) just in case
s = s.replaceAll('\u00e2\u20ac\u2122', '\u2019');

// Check for any remaining 0xE2-based mojibake
const remaining = [...s].filter(c => c === '\u00e2').length;
console.log('Remaining â chars:', remaining);

// Also check 2500â€"4000 style (en-dash between numbers)
// U+00E2 U+20AC U+201C is en-dash
const hasEnDash = s.includes('2500\u20134000');
console.log('Has correct en-dash in 2500-4000:', hasEnDash);

fs.writeFileSync(file, s, 'utf8');
console.log('Done. File written.');

// Verify
const v = fs.readFileSync(file, 'utf8');
console.log('Has em dash:', v.includes('\u2014'));
console.log('Sample line 21:', v.split('\n')[20].slice(55, 100));
