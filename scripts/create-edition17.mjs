import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://soyuzbszsboltthjlxze.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveXV6YnN6c2JvbHR0aGpseHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDIxMDMsImV4cCI6MjA4ODAxODEwM30.-anUzQTfDGJa2aJrVX-LEgcKr7yHTCudf6asJsWUwqc'
);

// Check if edition 17 already exists
const { data: existing } = await supabase.from('editions').select('id, title, year').eq('year', 2026).maybeSingle();
if (existing) {
  console.log('Edition 17 already exists:', existing);
  
  // Update it with Breath theme data
  const { data, error } = await supabase.from('editions').update({
    title: 'IFFA 17',
    slug: 'edicioni-i-17-te-2026',
    theme: 'FRYMË / BREATH',
    theme_description: `Breath is the most ordinary miracle: constant, unconscious, and taken for granted—until the loss of a single breath alters everything. It is both vulnerability and power: a rhythm that can be interrupted, trained, shared, stolen, or protected.

This theme understands breathing not only as a biological function, but as a way of being: as presence, as a relationship with the body and the world, as both a right and an ecological responsibility, and as an act of creation.

From these starting points, Breath invites photographers to enter the theme through five doors: intimate moments where breath becomes palpable; small signs where the invisible appears as a trace; the ways we animate places, objects, and memories; the ecological conditions of air—pollution, burning, traffic, dust; and the sharpest question of our time: when machines can simulate so much, what remains unmistakably alive in a photograph?

FRYMË / BREATH is therefore an invitation to photograph not only what is seen, but what sustains us: the invisible rhythm of being, the conditions of life, the politics of air, and the human capacity to breathe life into the world—through an image, through memory, through a simple act of presence.`,
    description: '17th International Fine Art Photography Award — FOKUS, Fier 2026',
    status: 'open',
    submission_start: '2026-03-20',
    submission_end: '2026-06-30',
    published: true,
  }).eq('year', 2026).select();
  
  if (error) console.error('Update error:', error);
  else {
    const row = data?.[0];
    console.log('Updated:', row?.id, row?.title, row?.theme);
    
    // Add categories if not already there
    if (row?.id) {
      const { data: existingCats } = await supabase.from('categories').select('id').eq('edition_id', row.id);
      if (!existingCats || existingCats.length === 0) {
        const categories = [
          { name: 'BREATH — Main Theme', sort_order: 1, max_photos: 12 },
          { name: 'PRESS & NEWS', sort_order: 2, max_photos: 12 },
          { name: 'PORTRAIT', sort_order: 3, max_photos: 12 },
          { name: 'LAND', sort_order: 4, max_photos: 12 },
          { name: 'LIFE', sort_order: 5, max_photos: 12 },
        ];
        const { data: cats, error: catErr } = await supabase.from('categories').insert(
          categories.map(c => ({ ...c, edition_id: row.id }))
        ).select();
        if (catErr) console.error('Categories error:', catErr);
        else console.log('Categories created:', cats?.map(c => c.name).join(', '));
      } else {
        console.log('Categories already exist:', existingCats.length);
      }
    }
  }
} else {
  // Insert new
  const { data, error } = await supabase.from('editions').insert({
    title: 'IFFA 17',
    slug: 'edicioni-i-17-te-2026',
    year: 2026,
    theme: 'FRYMË / BREATH',
    theme_description: `Breath is the most ordinary miracle: constant, unconscious, and taken for granted—until the loss of a single breath alters everything. It is both vulnerability and power: a rhythm that can be interrupted, trained, shared, stolen, or protected.

This theme understands breathing not only as a biological function, but as a way of being: as presence, as a relationship with the body and the world, as both a right and an ecological responsibility, and as an act of creation.

From these starting points, Breath invites photographers to enter the theme through five doors: intimate moments where breath becomes palpable; small signs where the invisible appears as a trace; the ways we animate places, objects, and memories; the ecological conditions of air—pollution, burning, traffic, dust; and the sharpest question of our time: when machines can simulate so much, what remains unmistakably alive in a photograph?

FRYMË / BREATH is therefore an invitation to photograph not only what is seen, but what sustains us: the invisible rhythm of being, the conditions of life, the politics of air, and the human capacity to breathe life into the world—through an image, through memory, through a simple act of presence.`,
    description: '17th International Fine Art Photography Award — FOKUS, Fier 2026',
    status: 'open',
    submission_start: '2026-03-20',
    submission_end: '2026-06-30',
    published: true,
  }).select().single();
  
  if (error) console.error('Insert error:', error);
  else console.log('Created:', data?.id, data?.title, data?.theme);
  
  // Add categories
  if (data?.id) {
    const categories = [
      { name: 'BREATH — Main Theme', sort_order: 1, max_photos: 12 },
      { name: 'PRESS & NEWS', sort_order: 2, max_photos: 12 },
      { name: 'PORTRAIT', sort_order: 3, max_photos: 12 },
      { name: 'LAND', sort_order: 4, max_photos: 12 },
      { name: 'LIFE', sort_order: 5, max_photos: 12 },
    ];
    const { data: cats, error: catErr } = await supabase.from('categories').insert(
      categories.map(c => ({ ...c, edition_id: data.id }))
    ).select();
    if (catErr) console.error('Categories error:', catErr);
    else console.log('Categories created:', cats?.map(c => c.name).join(', '));
  }
}
