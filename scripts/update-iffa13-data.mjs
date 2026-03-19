import fs from 'fs';

const R2_PUBLIC = 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev';
const YEAR = 2022;
const EDITION_NUM = 13;

// ── Winner photo assignments ─────────────────────────
// Order within each section determined from the page carousel (first shown = 1st place)
const WINNERS = {
  'THE OTHER': [
    { file: 'Mourning.jpg',              place: 1, title: 'Mourning',                                                    photographer: null },
    { file: 'bargaining-the-rights.jpg', place: 2, title: 'Bargaining the Rights',                                      photographer: null },
    { file: 'NA1M4594.jpg',             place: 3, title: null,                                                          photographer: null },
  ],
  'WEDDING': [
    { file: 'Wedding-the-father-shakes-the-daughters-hand-after-the-wedding-is-over-@Vlasov-SULAJ.jpg',
                                         place: 1, title: "The Father Shakes the Daughter's Hand After the Wedding Is Over", photographer: 'Vlasov Sulaj' },
    { file: 'Wedding.jpg',              place: 2, title: 'Wedding',                                                     photographer: null },
    { file: '219754060_2316014378540354_6307043800021906340_n.jpg',
                                         place: 3, title: null,                                                          photographer: null },
  ],
  'STREET': [
    { file: 'DSCF4867.jpg',            place: 1, title: null,                                                           photographer: null },
    { file: 'Balkan-Rapsody.jpg',      place: 2, title: 'Balkan Rapsody',                                               photographer: null },
    { file: 'inbound-192937571.jpg',   place: 3, title: null,                                                           photographer: null },
  ],
  'PRESS AND NEWS': [
    { file: 'BMurina-media.jpg',       place: 1, title: null,                                                           photographer: 'B. Murina' },
    { file: 'Press-videographer-crashes-filming-the-arrest-of-a-protester-@Vlasov-SULAJ.jpg',
                                        place: 2, title: 'Press Videographer Crashes Filming the Arrest of a Protester', photographer: 'Vlasov Sulaj' },
    { file: 'Candidate.jpg',           place: 3, title: 'Candidate',                                                    photographer: null },
  ],
  'PORTRAIT': [
    { file: 'Pershendetja-e-fundit.jpg',  place: 1, title: 'Pershendetja e Fundit',                                    photographer: null },
    { file: 'Selanik-323-01-11-19.jpg',   place: 2, title: 'Selanik 323',                                              photographer: null },
    { file: 'Portrait-Sualdo-Dino.jpg',   place: 3, title: 'Portrait',                                                 photographer: 'Sualdo Dino' },
  ],
  'NATURE': [
    { file: 'cardellini_due_belli2.jpg',        place: 1, title: 'Cardellini Due Belli',                                photographer: null },
    { file: 'swan.jpg',                         place: 2, title: 'Swan',                                                photographer: null },
    { file: 'RAHMAD-HIMAWAN-2022-1263.jpg',     place: 3, title: 'The Story of a Reflection in the Morning in a Rural Rice Field', photographer: 'Rahmad Himawan' },
  ],
  'FASHION': [
    { file: '19maggio444.jpg',                       place: 1, title: '19 Maggio',           photographer: null },
    { file: 'Rain-Nikolla-Wings-of-the-Morning.jpg', place: 2, title: 'Wings of the Morning', photographer: 'Rain Nikolla' },
    { file: 'Model.jpg',                             place: 3, title: 'Model',                photographer: null },
  ],
};

// Facebook participant results from migration
const FB_RESULTS = JSON.parse(fs.readFileSync('tmp_fb_results.json', 'utf8'));

// ── Update gallery-data.json ─────────────────────────
const data = JSON.parse(fs.readFileSync('public/gallery-data.json', 'utf8'));
const edition = data.editions.find(e => e.year === YEAR);

// Update edition metadata
edition.categories = Object.keys(WINNERS);
edition.mainCategory = 'THE OTHER';
edition.winner = null; // Photographer unknown for THE OTHER 1st place

// The jury photo: not a competition photo — flag or remove
const juryPhoto = data.photos.find(p => p.r2Key === 'gallery/2022/juria-finale-justini.jpg');
if (juryPhoto) {
  juryPhoto.isWinner = false;
  juryPhoto.category = null;
  juryPhoto.isJury = true;
  juryPhoto.photographer = null;
  juryPhoto.title = null;
  console.log('Flagged jury photo as isJury=true');
}

// Remove all existing 2022 competition photos (to rebuild cleanly, excluding jury)
const other2022 = data.photos.filter(p => p.edition === EDITION_NUM && !p.isJury);
console.log(`Removing ${other2022.length} old competition photos for edition ${EDITION_NUM}`);
data.photos = data.photos.filter(p => p.edition !== EDITION_NUM || p.isJury === true);

// ── Rebuild competition photos ───────────────────────
let added = 0;

for (const [category, winners] of Object.entries(WINNERS)) {
  // Add winner photos
  for (const w of winners) {
    const r2Key = `gallery/${YEAR}/${w.file}`;
    data.photos.push({
      r2Key,
      url: `${R2_PUBLIC}/${r2Key}`,
      category,
      isWinner: true,
      place: w.place,
      title: w.title,
      photographer: w.photographer,
      edition: EDITION_NUM,
      year: YEAR,
    });
    added++;
  }

  // Add participant photos from Facebook
  const slug = category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const participants = FB_RESULTS[category] || [];
  for (const p of participants) {
    data.photos.push({
      r2Key: p.r2Key,
      url: p.url,
      category,
      isWinner: false,
      place: null,
      title: null,
      photographer: null,
      edition: EDITION_NUM,
      year: YEAR,
    });
    added++;
  }
}

// Update photo count on edition
edition.photoCount = data.photos.filter(p => p.edition === EDITION_NUM).length;

fs.writeFileSync('public/gallery-data.json', JSON.stringify(data, null, 2));
console.log(`Done. Added ${added} competition photos.`);
console.log(`Edition ${EDITION_NUM} (${YEAR}) now has ${edition.photoCount} photos`);
console.log('Categories:', edition.categories);

// Quick sanity check
const winners2022 = data.photos.filter(p => p.edition === EDITION_NUM && p.isWinner);
const participants2022 = data.photos.filter(p => p.edition === EDITION_NUM && !p.isWinner && !p.isJury);
console.log(`Winners: ${winners2022.length}, Participants: ${participants2022.length}`);
