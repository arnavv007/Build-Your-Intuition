-- ================================================================
--  Build Your Intuition — Supabase PostgreSQL Schema
--  Run this entire file in: Supabase Dashboard → SQL Editor
-- ================================================================
 
-- ── PROFILES ──────────────────────────────────────────────────
-- Extends Supabase Auth users with extra profile info
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  bio         TEXT,
  avatar_url  TEXT,
  is_founder  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
 
-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
 
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
 
 
-- ── CATEGORIES ────────────────────────────────────────────────
CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  name  TEXT UNIQUE NOT NULL,
  slug  TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#00e5c8'
);
 
-- Seed the default categories
INSERT INTO categories (name, slug, color) VALUES
  ('Physics',          'physics',          '#00e5c8'),
  ('Mathematics',      'mathematics',      '#f0b429'),
  ('Chemistry',        'chemistry',        '#ff6b4a'),
  ('Biology',          'biology',          '#34d399'),
  ('Astronomy',        'astronomy',        '#818cf8'),
  ('Thermodynamics',   'thermodynamics',   '#f87171'),
  ('Electromagnetism', 'electromagnetism', '#60a5fa'),
  ('Quantum',          'quantum',          '#c084fc'),
  ('Fluid Dynamics',   'fluid-dynamics',   '#2dd4bf'),
  ('Neuroscience',     'neuroscience',     '#fb923c'),
  ('Cosmology',        'cosmology',        '#a78bfa'),
  ('Technology',       'technology',       '#4ade80'),
  ('Philosophy',       'philosophy',       '#fbbf24'),
  ('Other',            'other',            '#9ca3af');
 
 
-- ── POSTS ─────────────────────────────────────────────────────
CREATE TABLE posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT,                          -- plain text fallback
  blocks       JSONB,                         -- rich block array (text/image/chart/video)
  type         TEXT NOT NULL CHECK (type IN ('explanation','insight')),
  post_format  TEXT CHECK (post_format IN ('question','answer')),
  category_id  INTEGER REFERENCES categories(id),
  upvotes      INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
 
-- Auto-update the updated_at timestamp on edit
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
 
 
-- ── COMMENTS ──────────────────────────────────────────────────
CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES comments(id) ON DELETE CASCADE,  -- for replies
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
 
 
-- ── VOTES ─────────────────────────────────────────────────────
CREATE TABLE votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, post_id)   -- one vote per user per post
);
 
-- Auto-update post.upvotes count when a vote is added or removed
CREATE OR REPLACE FUNCTION sync_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET upvotes = upvotes - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
 
CREATE TRIGGER on_vote_change
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION sync_upvotes();
 
 
-- ================================================================
--  ROW LEVEL SECURITY (RLS)
--  Controls who can read/write what
-- ================================================================
 
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
 
-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
 
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
 
-- CATEGORIES (read-only for everyone)
CREATE POLICY "Categories are public"
  ON categories FOR SELECT USING (true);
 
-- POSTS
CREATE POLICY "Published posts are viewable by everyone"
  ON posts FOR SELECT USING (is_published = true);
 
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
 
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE USING (auth.uid() = author_id);
 
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE USING (auth.uid() = author_id);
 
-- COMMENTS
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);
 
CREATE POLICY "Logged in users can comment"
  ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
 
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (auth.uid() = author_id);
 
-- VOTES
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT USING (true);
 
CREATE POLICY "Logged in users can vote"
  ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
 
CREATE POLICY "Users can remove their own vote"
  ON votes FOR DELETE USING (auth.uid() = user_id);
 
 
-- ================================================================
--  STORAGE BUCKET
--  Run separately after enabling Storage in your project
-- ================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);
 
-- CREATE POLICY "Anyone can view images"
--   ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
 
-- CREATE POLICY "Logged in users can upload images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');
 
-- CREATE POLICY "Users can delete their own images"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);