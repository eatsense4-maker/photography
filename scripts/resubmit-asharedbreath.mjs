import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://soyuzbszsboltthjlxze.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveXV6YnN6c2JvbHR0aGpseHplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0MjEwMywiZXhwIjoyMDg4MDE4MTAzfQ.Ya--T5krW5m9r4vZfkdup6jjSSHrOCjthDFxP_CA6W8';

const SUBMISSION_ID = 'c9cf62aa-a098-4a05-8242-72356a29c791';
const PHOTO_PATH = 'C:\\Users\\albih\\Downloads\\A Shared Breath.jpg';
const TITLE = 'A Shared Breath';
const DESCRIPTION = `Suspended over dark, still waters, two bodies lie in perfect, effortless alignment, a quiet study in shared rhythm and human presence. Stripped of life's noise and footwear, they exist in a rare pause, locked in a moment as soft and synchronized as a collective exhale. Seen from above, the wooden pier acts as a sanctuary, floating between the depth below and the open air above. The scene captures breath not merely as an involuntary biological function, but as an intimate bridge: the gentle rise and fall of chest to chest, the held breath before a gentle kiss, and the quiet realization that some of life's most meaningful connections are sustained in absolute stillness.`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  // 1. Upload photo to storage
  const fileBuffer = readFileSync(PHOTO_PATH);
  const fileExt = 'jpg';
  const storageKey = `submissions/${randomUUID()}-A_Shared_Breath.${fileExt}`;

  console.log(`Uploading photo to storage: ${storageKey}`);
  const { error: uploadError } = await supabase.storage
    .from('submissions')
    .upload(storageKey, fileBuffer, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) {
    console.error('Upload failed:', uploadError.message);
    process.exit(1);
  }
  console.log('Photo uploaded successfully.');

  // 2. Update submission: new title, description, status -> submitted
  const { error: subError } = await supabase
    .from('submissions')
    .update({
      title: TITLE,
      description: DESCRIPTION,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', SUBMISSION_ID);

  if (subError) {
    console.error('Submission update failed:', subError.message);
    process.exit(1);
  }
  console.log('Submission updated to "submitted".');

  // 3. Insert submission_photos record
  const { error: photoError } = await supabase
    .from('submission_photos')
    .insert({
      submission_id: SUBMISSION_ID,
      storage_key: storageKey,
      original_filename: 'A Shared Breath.jpg',
      mime_type: 'image/jpeg',
      file_size: fileBuffer.length,
      sort_order: 0,
      status: 'pending',
      title: TITLE,
      description: DESCRIPTION,
    });

  if (photoError) {
    console.error('Photo record insert failed:', photoError.message);
    process.exit(1);
  }
  console.log('submission_photos record created with status "pending".');
  console.log('Done! Submission is ready for re-review.');
}

main();
