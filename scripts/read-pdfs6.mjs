import * as pdfjsLib from '../node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, readdirSync } from 'fs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

const dir = 'C:/Users/albih/Downloads/';
const files = readdirSync(dir).filter(f => f.includes('concept') || f.includes('BREATH') || f.includes('koncept'));
console.log('Files:', files);

for (const fn of files) {
  try {
    const data = new Uint8Array(readFileSync(dir + fn));
    const doc = await pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, verbosity: 0 }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    console.log('\n=== ' + fn + ' ===\n' + text);
  } catch(e) {
    console.log('ERR ' + fn + ': ' + e.message);
  }
}
