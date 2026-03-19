const { PDFParse } = require('pdf-parse');
const pdfParse = (buf) => new PDFParse().parse(buf);
const fs = require('fs');
const dir = 'C:/Users/albih/Downloads/';
const files = fs.readdirSync(dir).filter(f => f.includes('Breath') || f.includes('Frym'));
console.log('Files found:', files);
(async () => {
  for (const fn of files) {
    try {
      const buf = fs.readFileSync(dir + fn);
      const data = await pdfParse(buf);
      console.log('\n=== ' + fn + ' ===');
      console.log(data.text.slice(0, 4000));
    } catch(e) { console.log('ERR ' + fn + ': ' + e.message); }
  }
})();
