-- Add multilingual fields and slug to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_al TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description_al TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT;

-- Populate slug from existing name
UPDATE categories SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'));

-- Populate Albanian names for existing FOKUS 17 categories
UPDATE categories SET name_al = 'Tema Kryesore — FRYMË' WHERE slug = 'main-theme-breath';
UPDATE categories SET name_al = 'Shtypi & Lajmet' WHERE slug = 'press-news';
UPDATE categories SET name_al = 'Jeta — Fotografia më e Mirë e Rrugës' WHERE slug = 'life-best-street-photography';
UPDATE categories SET name_al = 'Jeta — Portreti më i Mirë' WHERE slug = 'life-best-portrait';
UPDATE categories SET name_al = 'Toka — Peizazhi më i Mirë' WHERE slug = 'land-best-landscape';
UPDATE categories SET name_al = 'Toka — Bota e Egër më e Mirë' WHERE slug = 'land-best-wild-world';
