const fs = require('fs');
const file = 'G:/project web/photography/src/pages/public/HomePage.tsx';
const buf = fs.readFileSync(file);
// The file was saved with UTF-8 content but some tool wrote it in latin-1,
// causing multi-byte chars to be stored as raw bytes.
// Try reading as latin-1 and re-encoding as UTF-8:
const latin1 = buf.toString('latin1');
const reencoded = Buffer.from(latin1, 'latin1').toString('utf8');

// Check if re-encoding fixed the issue
if (reencoded.includes('FRYMË') || reencoded.includes('—')) {
  fs.writeFileSync(file, reencoded, 'utf8');
  console.log('Fixed via latin1->utf8 re-encode');
  console.log('Sample:', reencoded.substring(600, 900));
} else {
  // Already valid UTF-8 but with literal mojibake strings -- do string replacement
  let s = buf.toString('utf8');
  // Replace the mojibake sequences
  s = s.replace(/â€"/g, '—');   // em dash (E2 80 94)
  s = s.replace(/â€"/g, '–');   // en dash (E2 80 93) -- same display via grep
  s = s.replace(/Â·/g, '·');   // middle dot
  s = s.replace(/Ã‹/g, 'Ë');   // E with diaeresis
  s = s.replace(/6â€"12/g, '6–12');
  s = s.replace(/1â€"3/g, '1–3');
  s = s.replace(/2500â€"4000/g, '2500–4000');
  fs.writeFileSync(file, s, 'utf8');
  console.log('Fixed via string replacement');
  console.log('Sample:', s.substring(600, 900));
}
