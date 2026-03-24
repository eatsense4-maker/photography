-- Posts table for news & events (magazine-style homepage)
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  body TEXT,
  cover_image_url TEXT,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  facebook_url TEXT,
  category TEXT NOT NULL DEFAULT 'news' CHECK (category IN ('news', 'event', 'announcement')),
  featured BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for public queries
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts (published, pinned DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts (slug);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts (featured, published);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Public can read published posts"
  ON posts FOR SELECT
  USING (published = true);

-- Admins can do everything (adjust to your auth setup)
CREATE POLICY "Admins can manage posts"
  ON posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
