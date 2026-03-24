-- Seed 10 demo posts for FOKUS Award
INSERT INTO posts (title, slug, excerpt, body, cover_image_url, gallery_images, facebook_url, category, featured, pinned, published, published_at)
VALUES

-- 1. Pinned announcement
(
  'FOKUS Award 2026 — Call for Submissions Now Open',
  'fokus-award-2026-call-for-submissions',
  'We are thrilled to announce that the FOKUS Award 2026 photography competition is officially accepting submissions. Photographers from around the world are invited to share their vision.',
  'The FOKUS Award 2026 is now accepting entries from photographers worldwide. This year''s theme, "Perspectives," invites artists to explore how different viewpoints shape our understanding of the world around us.

## Key Dates
- **Submission Opens:** March 1, 2026
- **Submission Deadline:** June 30, 2026
- **Finalists Announced:** August 15, 2026
- **Winners Ceremony:** September 20, 2026

## Categories
- Street Photography
- Landscape & Nature
- Portrait
- Documentary
- Abstract & Experimental

## How to Enter
Visit our submissions page to upload your best work. Each photographer may submit up to 5 images per category. There is no entry fee for the first category; additional categories cost €10 each.

We look forward to seeing your unique perspective on the world.',
  'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&h=800&fit=crop',
  '["https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1554080353-a576cf803bda?w=800&h=600&fit=crop"]'::jsonb,
  NULL,
  'announcement', true, true, true, NOW() - INTERVAL '1 day'
),

-- 2. Featured event
(
  'Exhibition Opening: "Urban Light" at Gallery Pristina',
  'exhibition-urban-light-gallery-pristina',
  'Join us for the opening night of "Urban Light," a curated exhibition featuring works from last year''s FOKUS Award finalists exploring city life after dark.',
  'We are excited to invite you to the opening of **"Urban Light"**, a stunning exhibition showcasing the best night photography from FOKUS Award 2025 finalists.

The exhibition brings together 30 photographers whose work captures the magic, mystery, and energy of cities after dark. From neon-lit streets of Tokyo to the quiet canals of Amsterdam, these images reveal a world transformed by artificial light.

## Exhibition Details
- **Opening Night:** April 5, 2026, 7:00 PM
- **Location:** Gallery Pristina, Rr. Robert Doll 10
- **Exhibition Runs:** April 5 – May 15, 2026
- **Admission:** Free

Light refreshments will be served at the opening reception. The evening will include a panel talk with photographers Arta Berisha and Luan Mehmeti about the creative process behind their award-winning series.

RSVP is appreciated but not required.',
  'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=1200&h=800&fit=crop',
  '["https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=600&fit=crop"]'::jsonb,
  NULL,
  'event', true, false, true, NOW() - INTERVAL '2 days'
),

-- 3. News
(
  'Meet the 2025 Grand Prize Winner: Elena Vasquez',
  'meet-2025-grand-prize-winner-elena-vasquez',
  'Spanish photographer Elena Vasquez shares the story behind her award-winning series "Invisible Borders" that earned her the FOKUS Award Grand Prize.',
  'We sat down with **Elena Vasquez**, the 2025 FOKUS Award Grand Prize winner, to discuss her powerful series "Invisible Borders" — a documentary project exploring the lives of communities living along disputed territorial lines across Europe.

## On Winning the FOKUS Award

"I was genuinely speechless when they announced my name. The FOKUS Award has such an incredible history of recognizing meaningful work, and to be part of that legacy is something I still can''t quite believe," Elena told us.

## About "Invisible Borders"

The series took three years to complete. Elena traveled to 12 different border regions, spending weeks at a time with families whose daily lives are shaped by lines drawn on maps.

"Photography has this unique ability to make the invisible visible. These borders exist on paper, but the real boundaries are in people''s hearts and minds. I wanted to show both — the physical landscape and the emotional terrain."

## What''s Next

Elena is currently working on a follow-up project documenting reconnection stories — people who have found ways to bridge these borders through art, commerce, and love.

Her full series will be published as a photobook later this year by Steidl.',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&h=800&fit=crop',
  '["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop"]'::jsonb,
  NULL,
  'news', true, false, true, NOW() - INTERVAL '5 days'
),

-- 4. Event
(
  'Photography Workshop: Mastering Natural Light',
  'workshop-mastering-natural-light',
  'A hands-on weekend workshop led by award-winning photographer Driton Kelmendi, focusing on using natural light in portrait and landscape photography.',
  'Join us for an immersive two-day workshop with **Driton Kelmendi**, one of Kosovo''s most celebrated photographers, as he shares his techniques for harnessing natural light.

## Workshop Details
- **Date:** April 19–20, 2026
- **Time:** 9:00 AM – 5:00 PM both days
- **Location:** FOKUS Studio, Pristina
- **Price:** €75 (€55 for FOKUS members)
- **Capacity:** 15 participants

## What You''ll Learn
- Reading and predicting natural light throughout the day
- Golden hour and blue hour techniques
- Window light for indoor portraits
- Managing harsh midday sun
- Reflectors and diffusers on a budget
- Post-processing to enhance natural light

## What to Bring
- Your camera (any brand, DSLR or mirrorless)
- A lens in the 35–85mm range
- Laptop with Lightroom or Capture One (for day 2)

**Spaces are limited.** Register through the link below.',
  'https://images.unsplash.com/photo-1495745966610-2a67f2297e5e?w=1200&h=800&fit=crop',
  '["https://images.unsplash.com/photo-1495745966610-2a67f2297e5e?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop"]'::jsonb,
  NULL,
  'event', false, false, true, NOW() - INTERVAL '3 days'
),

-- 5. Announcement
(
  'New Partnership with National Museum of Photography',
  'partnership-national-museum-photography',
  'FOKUS Award is proud to announce a strategic partnership with the National Museum of Photography to expand educational programs and exhibition opportunities.',
  'We are delighted to announce that the FOKUS Award has entered into a formal partnership with the **National Museum of Photography**.

This collaboration will bring exciting new opportunities for photographers at every stage of their career:

## What This Means

- **Annual Exhibition Space:** FOKUS Award winners will have a dedicated exhibition at the museum each year
- **Educational Programs:** Joint workshops, masterclasses, and lecture series throughout the year
- **Residency Program:** Two photographers per year will receive a 3-month residency with studio space and a stipend
- **Archive Access:** Researchers and students will gain access to both organizations'' photographic archives

## A Shared Vision

"This partnership represents a shared commitment to nurturing photographic talent and making photography accessible to all," said our director. "Together, we can create a stronger ecosystem for visual storytelling in the region."

More details about specific programs will be announced in the coming weeks.',
  'https://images.unsplash.com/photo-1577720643272-265f09367456?w=1200&h=800&fit=crop',
  '["https://images.unsplash.com/photo-1577720643272-265f09367456?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1574182245530-967d9b3831af?w=800&h=600&fit=crop"]'::jsonb,
  NULL,
  'announcement', false, false, true, NOW() - INTERVAL '7 days'
),

-- 6. News
(
  'Behind the Lens: Top 10 Images from February Submissions',
  'top-10-images-february-submissions',
  'Our curatorial team selected the most striking images from this month''s early submissions. Here are the photographs that caught our eye.',
  'Every month, our curatorial team reviews incoming submissions and selects standout images to share with the community. Here are February''s most compelling entries.

These photographs represent a diverse range of styles and subjects, from intimate portraits to sweeping landscapes. What unites them is a masterful command of composition and an ability to evoke emotion.

## The Selection

The ten images chosen this month came from photographers in 8 different countries. Several common themes emerged:

- **Solitude and Reflection** — Several photographers explored themes of isolation in urban environments
- **Environmental Storytelling** — Strong documentary work addressing climate and nature
- **Bold Color Palettes** — A notable trend toward vivid, saturated color work
- **Analog Revival** — Three of the ten were shot on film

## Photographer Spotlight

We were particularly struck by the work of newcomer **Arjeta Pllana** from Prizren, whose series of fog-shrouded mountain villages feels both timeless and contemporary.

Stay tuned for March''s selection, and keep those submissions coming!',
  'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?w=1200&h=800&fit=crop',
  '["https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop"]'::jsonb,
  NULL,
  'news', false, false, true, NOW() - INTERVAL '10 days'
),

-- 7. Event
(
  'Photo Walk: Discover the Old Bazaar of Pristina',
  'photo-walk-old-bazaar-pristina',
  'Explore the historic Old Bazaar through your lens on this guided photo walk. All skill levels welcome — bring your camera and your curiosity.',
  'Join fellow photographers for a leisurely walk through one of Pristina''s most photogenic neighborhoods — the **Old Bazaar**.

## Event Details
- **Date:** March 29, 2026
- **Meeting Point:** Clock Tower, 10:00 AM
- **Duration:** Approximately 3 hours
- **Cost:** Free
- **Open to:** All skill levels

## What to Expect

Our guide, local photographer **Besnik Hoxha**, will lead you through winding streets filled with Ottoman-era architecture, bustling markets, and quiet courtyards that most visitors never find.

Along the way, Besnik will share tips on:
- Street photography etiquette
- Capturing architecture in tight spaces
- Working with mixed lighting conditions
- Finding unexpected compositions in familiar places

## After the Walk

We''ll gather at a nearby café to review our favorite shots from the day and share constructive feedback in a relaxed, supportive atmosphere.

**No registration needed — just show up!**',
  'https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=1200&h=800&fit=crop',
  '["https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=600&fit=crop"]'::jsonb,
  NULL,
  'event', false, false, true, NOW() - INTERVAL '4 days'
),

-- 8. Announcement
(
  'Submission Guidelines Updated for 2026 Season',
  'submission-guidelines-updated-2026',
  'Important updates to our submission guidelines including new file format requirements, category changes, and accessibility improvements.',
  'We have updated the FOKUS Award submission guidelines for the 2026 season. Please review these changes before submitting your work.

## Key Changes

### File Requirements
- **Maximum file size** increased from 20MB to 50MB per image
- **Accepted formats:** JPEG, TIFF, PNG (new: WebP also accepted)
- **Minimum resolution:** 3000px on the longest edge
- **Color space:** sRGB or Adobe RGB

### New Category
We have added a new category: **"Mobile Photography"** — open to images captured exclusively on smartphones or tablets. Minimal editing is permitted but AI-generated or heavily composited images are not eligible.

### Accessibility
- All entries now require a brief image description (alt text) for accessibility
- This is a simple 1-2 sentence description of what appears in the photograph
- Descriptions will be used to make our exhibitions and catalog more inclusive

### Series Submissions
- You may now submit a series of 3-8 connected images as a single entry
- Series will be judged as a cohesive body of work

Please visit the full guidelines page for complete details.',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=800&fit=crop',
  '["https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop"]'::jsonb,
  NULL,
  'announcement', false, false, true, NOW() - INTERVAL '12 days'
),

-- 9. News
(
  'FOKUS Award Featured in European Photography Magazine',
  'fokus-award-featured-european-photography-magazine',
  'The latest issue of European Photography Magazine features a 6-page spread on the FOKUS Award and its impact on emerging photographers in Southeast Europe.',
  'We are honored to share that the **European Photography Magazine** has published an in-depth feature on the FOKUS Award in their March 2026 issue.

The 6-page spread, written by critic and curator **Marie Lambert**, explores the history of the award, its growing international reputation, and the unique role it plays in supporting photographers from Southeast Europe.

## Highlights from the Article

> "In a region where photographic infrastructure is still developing, the FOKUS Award has become a vital bridge between local talent and the international photography world." — Marie Lambert

The article features interviews with:
- Past winners discussing how the award impacted their careers
- Our founding team on the vision behind the competition
- International jurors explaining what makes FOKUS entries distinctive

## Where to Read

The article is available in the print edition of European Photography Magazine (March 2026) and will be available on their website starting April 1.

We extend our gratitude to Marie Lambert and the EP Magazine team for this thoughtful and generous coverage.',
  'https://images.unsplash.com/photo-1504711434969-e33886168d7c?w=1200&h=800&fit=crop',
  '["https://images.unsplash.com/photo-1504711434969-e33886168d7c?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=800&h=600&fit=crop"]'::jsonb,
  NULL,
  'news', false, false, true, NOW() - INTERVAL '8 days'
),

-- 10. Event
(
  'Jury Panel Discussion: What Makes a Winning Photograph?',
  'jury-panel-discussion-winning-photograph',
  'Three of our 2026 jury members sit down for a live conversation about how they evaluate competition entries and what separates good from great photography.',
  'Ever wondered what goes through a juror''s mind when reviewing thousands of competition entries? Join us for a candid panel discussion with three members of the 2026 FOKUS Award jury.

## Panelists
- **Dr. Amira Hadzic** — Curator, Museum of Contemporary Art Sarajevo
- **Thomas Reinhardt** — Photo Editor, Der Spiegel
- **Fjolla Morina** — Documentary Photographer & 2023 FOKUS Award Winner

## Topics
- How first impressions shape the judging process
- Technical excellence vs. emotional impact
- Common mistakes that lead to elimination
- What makes a series stronger than individual images
- The role of context and artist statements
- Diversity and representation in competition photography

## Event Details
- **Date:** April 12, 2026
- **Time:** 6:00 PM – 8:00 PM
- **Location:** National Library of Kosovo, Conference Hall
- **Admission:** Free (registration required)
- **Format:** 45-minute moderated discussion + 45-minute audience Q&A

This is a rare opportunity to hear directly from the people who will be selecting this year''s winners. Whether you''re planning to submit or simply passionate about photography, this evening promises to be insightful and inspiring.

**Register via the link below — seats are limited to 120.**',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&h=800&fit=crop',
  '["https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&h=600&fit=crop"]'::jsonb,
  NULL,
  'event', false, false, true, NOW() - INTERVAL '6 days'
);
