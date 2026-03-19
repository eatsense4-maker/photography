import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import fs from 'fs';

const files = [
  'C:/Users/albih/Downloads/Submission guidelines_Breath.pdf',
  'C:/Users/albih/Downloads/FRYM\u00CB _ BREATH concept_english.pdf',
  'C:/Users/albih/Downloads/FRYM\u00CB _ BREATH_koncept i thelluar shqip_BlertaKambo.pdf',
  'C:/Users/albih/Downloads/udh\u00ebzime aplikimi_Frym\u00eb.pdf',
];

for (const f of files) {
  try {
    const buf = fs.readFileSync(f);
    const { text } = await pdfParse(buf);
    const name = f.split('/').pop();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FILE: ${name}`);
    console.log('='.repeat(60));
    console.log(text.slice(0, 4000));
  } catch (e) {
    console.log(`ERROR ${f}: ${e.message}`);
  }
}
