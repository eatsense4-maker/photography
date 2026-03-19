const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const dir = 'C:/Users/albih/Downloads/';
const files = fs.readdirSync(dir).filter(f => f.includes('Breath') || f.includes('Frym'));
console.log('Files:', files);

(async () => {
  for (const fn of files) {
    try {
      const data = new Uint8Array(fs.readFileSync(dir + fn));
      const loadingTask = pdfjsLib.getDocument({
        data,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
        verbosity: 0,
      });
      const doc = await loadingTask.promise;
      let text = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      console.log('\n=== ' + fn + ' ===');
      console.log(text.slice(0, 5000));
    } catch(e) {
      console.log('ERR ' + fn + ': ' + e.message);
    }
  }
})();
