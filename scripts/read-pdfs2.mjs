const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
const fs = require('fs');

// Read PDF using raw flate decode via zlib
const zlib = require('zlib');

function extractTextFromPDF(buf) {
  // Try to find ToUnicode or actual text streams
  // Look for readable text between BT and ET markers in decoded streams
  const text = buf.toString('binary');
  
  // Find all stream content
  const results = [];
  let pos = 0;
  while (pos < text.length) {
    const streamStart = text.indexOf('stream\r\n', pos);
    if (streamStart < 0) break;
    const streamEnd = text.indexOf('endstream', streamStart);
    if (streamEnd < 0) break;
    
    const rawStream = buf.slice(streamStart + 8, streamEnd);
    
    try {
      const decoded = zlib.inflateRawSync(rawStream);
      const decodedStr = decoded.toString('utf8');
      
      // Extract text between BT and ET
      const btMatches = decodedStr.matchAll(/BT([\s\S]*?)ET/g);
      for (const m of btMatches) {
        // Extract strings from Tj, TJ, '  operators  
        const tjMatches = m[1].matchAll(/\(([^)]+)\)\s*(?:Tj|'|")/g);
        for (const t of tjMatches) {
          const clean = t[1].replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
                            .replace(/\\\\/g,'\\').replace(/\\\(/g,'(').replace(/\\\)/g,')');
          if (clean.trim()) results.push(clean);
        }
        // Array form: [(text) ...] TJ
        const tjArrayMatches = m[1].matchAll(/\[([^\]]+)\]\s*TJ/g);
        for (const t of tjArrayMatches) {
          const inner = t[1];
          const parts = inner.matchAll(/\(([^)]+)\)/g);
          for (const p of parts) {
            const clean = p[1].replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
                              .replace(/\\\\/g,'\\').replace(/\\\(/g,'(').replace(/\\\)/g,')');
            if (clean.trim()) results.push(clean);
          }
        }
      }
    } catch {}
    
    pos = streamEnd + 9;
  }
  
  return results.join(' ');
}

const paths = [
  'Submission guidelines_Breath.pdf',
  'FRYM\u00CB _ BREATH concept_english.pdf',
  'udh\u00ebzime aplikimi_Frym\u00eb.pdf',
];

for (const name of paths) {
  try {
    // Try glob
    const dir = 'C:/Users/albih/Downloads/';
    const files = fs.readdirSync(dir);
    const match = files.find(f => f.includes('Breath') || f.includes('Frym') || f.includes('Frym\u00eb'));
    const found = files.filter(f => {
      if (name.includes('guidelines')) return f.includes('guidelines');
      if (name.includes('concept')) return f.includes('concept');
      if (name.includes('udh')) return f.includes('udh');
      return false;
    });
    
    for (const fn of found) {
      const fp = dir + fn;
      console.log(`\n${'='.repeat(60)}`);
      console.log('FILE:', fn);
      console.log('='.repeat(60));
      const buf = fs.readFileSync(fp);
      const text = extractTextFromPDF(buf);
      console.log(text.slice(0, 3000) || '(no text extracted)');
    }
  } catch(e) {
    console.log('Error:', e.message);
  }
}
