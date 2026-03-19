import fs from 'fs';

const html = fs.readFileSync('tmp_kuratore.html', 'utf8');

// Get full text around Albes Fusha image
const idx = html.indexOf('Albes-Fusha2.jpg');
const snippet = html.slice(Math.max(0, idx - 100), idx + 3000);
const text = snippet.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
console.log('=== ALBES FUSHA SECTION ===');
console.log(text.slice(0, 1200));

// Get all text between each curator name
const sectionMarkers = ['ARBEN ALLIAJ', 'BURIM MYFTIU', 'SAIMIR AHMETI', 'ELTON KORITARI', 'OSMAN DEMIRI', 'VLORA DEMIRI'];
const fullText = html.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');

for (let i = 0; i < sectionMarkers.length; i++) {
  const start = fullText.indexOf(sectionMarkers[i]);
  const end = i < sectionMarkers.length - 1 ? fullText.indexOf(sectionMarkers[i+1]) : start + 2000;
  if (start < 0) { console.log(`NOT FOUND: ${sectionMarkers[i]}`); continue; }
  console.log(`\n=== ${sectionMarkers[i]} ===`);
  console.log(fullText.slice(start, Math.min(end, start + 800)).trim());
}
