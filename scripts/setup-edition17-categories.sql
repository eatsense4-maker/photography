-- ============================================================
-- Edition 17 (FOKUS 17 · 2026) — Full Setup
-- Theme: FRYMË / BREATH
-- 4 Main Competing Areas with Prizes
-- ============================================================

-- 1) Update the edition with theme, prizes, rules, and deadlines
UPDATE editions
SET
  theme = 'FRYMË / BREATH',
  theme_description = 'Breath is the most ordinary miracle: constant, unconscious, and taken for granted — until the loss of a single breath alters everything. It is both vulnerability and power: a rhythm that can be interrupted, trained, shared, stolen, or protected.

The 17th edition of the FOKUS Award invites photographers to explore breath — not merely as a biological act, but as a visual metaphor. From the intimate fog on a winter window to the last gasp of a dying glacier, from the rhythm of a sleeping child to the suffocating air of a polluted city — breath is everywhere, and it is political, poetic, ecological, and deeply personal.

We seek images that make us inhale sharply, hold our breath, or exhale with relief. Photographs that capture the visible and invisible movements of air, life, tension, and release.',
  prizes = '## Competition Prizes

### Main Theme Category — BREATH
**1st Place: €1,000**
The best photographic work exploring the theme "FRYMË / BREATH."

### Press & News Category
**1st Place: €1,000**
The best press or documentary photography capturing current events and stories.

### Life Category
- **Best Street Photography: €500** — Capturing authentic moments of everyday life in public spaces.
- **Best Portrait: €500** — The most compelling portrait work.

### Land Category
- **Best Landscape: €500** — Outstanding landscape photography.
- **Best Wild World: €500** — The best wildlife and nature photography.

### Additional Awards
- Honorary Diplomas for runners-up in each category
- Exhibition inclusion at FOKUS Award Gallery, Fier 2026
- Publication in the FOKUS Award catalog',
  rules = '## Submission Rules

### Eligibility
- Open to all photographers aged 18 and above, worldwide
- Both amateur and professional photographers may participate

### Entry Requirements
- **Main Theme (BREATH):** Submit 6–12 images as a series, OR 1–3 images as a single entry
- **Press & News:** Submit 6–12 images as a series, OR 1–3 images as a single entry
- **Life Category:** Submit 1–6 images per sub-category (Street Photography, Portrait)
- **Land Category:** Submit 1–6 images per sub-category (Landscape, Wild World)

### Technical Specifications
- Format: JPEG, sRGB color space
- Resolution: 2500–4000 pixels on the longest side
- File size: Maximum 10 MB per image
- Photo period: Images taken between 2022–2026

### Important Notes
- AI-generated images are NOT accepted
- Minor post-processing is allowed (exposure, contrast, cropping, B&W conversion)
- Heavy manipulation, compositing, or AI-assisted generation will result in disqualification
- Each entry must include a title and brief description
- Submission deadline: 30 June 2026',
  submission_start = '2026-03-01T00:00:00+00',
  submission_end = '2026-06-30T23:59:59+00',
  updated_at = NOW()
WHERE id = 'a46b7efd-a8f4-45a0-9250-a806f4c90eb7';

-- 2) Remove any old categories (safety)
DELETE FROM categories WHERE edition_id = 'a46b7efd-a8f4-45a0-9250-a806f4c90eb7';

-- 3) Insert the 4 main categories with sub-awards

-- Category 1: Main Theme — BREATH (€1,000 prize)
INSERT INTO categories (edition_id, name, description, max_photos, price, sort_order)
VALUES (
  'a46b7efd-a8f4-45a0-9250-a806f4c90eb7',
  'Main Theme — BREATH',
  'The central category of FOKUS 17. Explore breath as a visual metaphor — intimate, ecological, political, or personal. Submit a series (6–12 images) or a single entry (1–3 images). First place wins €1,000.',
  12,
  0,
  1
);

-- Category 2: Press & News (€1,000 prize)
INSERT INTO categories (edition_id, name, description, max_photos, price, sort_order)
VALUES (
  'a46b7efd-a8f4-45a0-9250-a806f4c90eb7',
  'Press & News',
  'Documentary and press photography capturing current events, human stories, and journalistic narratives. Submit a series (6–12 images) or a single entry (1–3 images). First place wins €1,000.',
  12,
  0,
  2
);

-- Category 3a: Life — Best Street Photography (€500 prize)
INSERT INTO categories (edition_id, name, description, max_photos, price, sort_order)
VALUES (
  'a46b7efd-a8f4-45a0-9250-a806f4c90eb7',
  'Life — Best Street Photography',
  'Candid and authentic moments captured in public spaces. The art of observing and freezing everyday life as it unfolds on the streets. Winner receives €500.',
  6,
  0,
  3
);

-- Category 3b: Life — Best Portrait (€500 prize)
INSERT INTO categories (edition_id, name, description, max_photos, price, sort_order)
VALUES (
  'a46b7efd-a8f4-45a0-9250-a806f4c90eb7',
  'Life — Best Portrait',
  'Compelling portrait work that reveals character, emotion, and the human condition. Winner receives €500.',
  6,
  0,
  4
);

-- Category 4a: Land — Best Landscape (€500 prize)
INSERT INTO categories (edition_id, name, description, max_photos, price, sort_order)
VALUES (
  'a46b7efd-a8f4-45a0-9250-a806f4c90eb7',
  'Land — Best Landscape',
  'Outstanding landscape photography showcasing the beauty, drama, and fragility of natural and urban environments. Winner receives €500.',
  6,
  0,
  5
);

-- Category 4b: Land — Best Wild World (€500 prize)
INSERT INTO categories (edition_id, name, description, max_photos, price, sort_order)
VALUES (
  'a46b7efd-a8f4-45a0-9250-a806f4c90eb7',
  'Land — Best Wild World',
  'Wildlife and nature photography capturing animals, ecosystems, and the untamed beauty of the natural world. Winner receives €500.',
  6,
  0,
  6
);
