-- ================================================================
--  Build Your Intuition — Schema Improvements
--  Run this in Supabase Dashboard → SQL Editor
--  AFTER you have already run the original schema.sql
--
--  Safe to run on an existing database — uses IF NOT EXISTS,
--  DO $$ blocks, and ALTER ... IF EXISTS where needed.
-- ================================================================
 
 
-- ================================================================
--  1. CASE-INSENSITIVE USERNAMES  (citext extension)
-- ================================================================
 
-- Enable the citext extension (available in all Supabase projects)
CREATE EXTENSION IF NOT EXISTS citext;
 
-- Convert the username column to citext
-- The existing UNIQUE index is automatically preserved
ALTER TABLE profiles
  ALTER COLUMN username TYPE citext;
 
-- Verify: 'Arnav' and 'arnav' will now be treated as the same username
 
 
-- ================================================================
--  2. PERFORMANCE INDEXES
-- ================================================================
 
-- Feed sorting — most common query is "latest posts first"
CREATE INDEX IF NOT EXISTS idx_posts_created_at
  ON posts (created_at DESC);
 
-- Filter posts by author (user profile pages, founder panel)
CREATE INDEX IF NOT EXISTS idx_posts_author_id
  ON posts (author_id);
 
-- Filter posts by category (topic pill filtering)
CREATE INDEX IF NOT EXISTS idx_posts_category_id
  ON posts (category_id);
 
-- Load comments for a post (will be used when comments are displayed)
CREATE INDEX IF NOT EXISTS idx_comments_post_id
  ON comments (post_id);
 
-- Count / check votes per post (upvote sync trigger, vote checks)
CREATE INDEX IF NOT EXISTS idx_votes_post_id
  ON votes (post_id);
 
-- Check if a specific user already voted on a post
CREATE INDEX IF NOT EXISTS idx_votes_user_id
  ON votes (user_id);
 
-- Composite index: the most common vote lookup is "did THIS user vote on THIS post?"
-- More efficient than two separate indexes for the unique-vote check
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_user_post
  ON votes (user_id, post_id);
 
 
-- ================================================================
--  3. POST VIEW COUNTER
-- ================================================================
 
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
 
-- Prevent view count from going negative (same safety as upvotes below)
ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_view_count_non_negative;
ALTER TABLE posts
  ADD CONSTRAINT posts_view_count_non_negative CHECK (view_count >= 0);
 
-- Helper function to increment view count safely from the frontend:
--   await supabase.rpc('increment_view', { post_id: '<uuid>' })
CREATE OR REPLACE FUNCTION increment_view(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
    SET view_count = view_count + 1
    WHERE id = post_id AND is_published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
 
 
-- ================================================================
--  4. CONTROLLED POST TYPE & FORMAT  (ENUMs)
-- ================================================================
 
-- Create ENUMs so only valid values can be inserted
-- IF the column already has data, we convert safely using USING clause
 
DO $$
BEGIN
  -- post_type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_type') THEN
    CREATE TYPE post_type AS ENUM ('explanation', 'insight');
  END IF;
 
  -- post_format enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_format_type') THEN
    CREATE TYPE post_format_type AS ENUM ('question', 'answer');
  END IF;
END $$;
 
-- Convert existing TEXT columns to the new ENUMs
-- USING clause handles the cast from plain text to enum safely
ALTER TABLE posts
  ALTER COLUMN type
    TYPE post_type
    USING type::post_type;
 
ALTER TABLE posts
  ALTER COLUMN post_format
    TYPE post_format_type
    USING post_format::post_format_type;
 
-- Note: to add a new allowed value in future, use:
--   ALTER TYPE post_type ADD VALUE 'discussion';
-- No table migration needed.
 
 
-- ================================================================
--  5. PREVENT NEGATIVE UPVOTES
-- ================================================================
 
-- Drop old constraint if it exists (idempotent re-run safety)
ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_upvotes_non_negative;
 
ALTER TABLE posts
  ADD CONSTRAINT posts_upvotes_non_negative CHECK (upvotes >= 0);
 
-- Also make the sync_upvotes trigger safe against going below zero
CREATE OR REPLACE FUNCTION sync_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- GREATEST ensures we never go below 0 even if data is inconsistent
    UPDATE posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
 
-- Recreate the trigger (CREATE OR REPLACE handles the update)
DROP TRIGGER IF EXISTS on_vote_change ON votes;
CREATE TRIGGER on_vote_change
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION sync_upvotes();
 
 
-- ================================================================
--  6. USERNAME VALIDATION CONSTRAINT
-- ================================================================
 
-- Drop old constraint if re-running this migration
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_username_valid;
 
ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_valid CHECK (
    length(username) >= 3
    AND username ~ '^[A-Za-z0-9_]+$'
  );
 
-- Note: because username is now citext, the regex ~ operator
-- is case-insensitive by default, which is exactly what we want.
 
 
-- ================================================================
--  7. UPDATED_AT COLUMN FOR COMMENTS
-- ================================================================
 
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
 
-- Reuse the existing update_updated_at() function from the original schema
DROP TRIGGER IF EXISTS comments_updated_at ON comments;
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
 
 
-- ================================================================
--  8. FUTURE-PROOFING  (no frontend changes required)
-- ================================================================
 
 
-- ── 8a. Soft-delete posts instead of hard-delete ────────────────
-- Adds a deleted_at timestamp. When set, the post is hidden but
-- the row (and all its votes/comments) is preserved for moderation.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
 
-- Update the RLS read policy to also exclude soft-deleted posts
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON posts;
CREATE POLICY "Published posts are viewable by everyone"
  ON posts FOR SELECT
  USING (is_published = true AND deleted_at IS NULL);
 
-- Index on deleted_at so the filter is fast even at large scale
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at
  ON posts (deleted_at)
  WHERE deleted_at IS NULL;   -- partial index — only indexes non-deleted rows
 
 
-- ── 8b. Comment count cache on posts ────────────────────────────
-- Avoids a COUNT(*) join on every feed query
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;
 
ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_comment_count_non_negative;
ALTER TABLE posts
  ADD CONSTRAINT posts_comment_count_non_negative CHECK (comment_count >= 0);
 
CREATE OR REPLACE FUNCTION sync_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
 
DROP TRIGGER IF EXISTS on_comment_change ON comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION sync_comment_count();
 
 
-- ── 8c. Full-text search index on posts ─────────────────────────
-- Enables fast keyword search across title + body without a paid
-- search service. Use with: .textSearch('search_vector', query)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
 
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body,  '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
DROP TRIGGER IF EXISTS posts_search_vector_update ON posts;
CREATE TRIGGER posts_search_vector_update
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();
 
-- GIN index makes the text search fast
CREATE INDEX IF NOT EXISTS idx_posts_search_vector
  ON posts USING GIN (search_vector);
 
-- Back-fill the column for any existing posts
UPDATE posts SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(body,  '')), 'B')
WHERE search_vector IS NULL;
 
 
-- ── 8d. Partial index for the feed ──────────────────────────────
-- The feed only ever shows published, non-deleted posts sorted by
-- created_at. A partial index covering exactly that query is much
-- smaller and faster than a full-table index.
DROP INDEX IF EXISTS idx_posts_feed;
CREATE INDEX idx_posts_feed
  ON posts (created_at DESC)
  WHERE is_published = true AND deleted_at IS NULL;
 
 
-- ── 8e. Updated_at index on posts ───────────────────────────────
-- Useful for "recently edited" queries without scanning the table
CREATE INDEX IF NOT EXISTS idx_posts_updated_at
  ON posts (updated_at DESC);
 
 
-- ================================================================
--  VERIFICATION QUERIES
--  Run these after the migration to confirm everything applied.
-- ================================================================
 
-- Check all columns on posts
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'posts'
--   ORDER BY ordinal_position;
 
-- Check all indexes
-- SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE tablename IN ('posts','comments','votes','profiles')
--   ORDER BY tablename, indexname;
 
-- Check all constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid IN ('posts'::regclass, 'profiles'::regclass)
--   ORDER BY conrelid, conname;
 
-- Check ENUMs exist
-- SELECT typname, enumlabel
--   FROM pg_enum
--   JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
--   WHERE typname IN ('post_type', 'post_format_type')
--   ORDER BY typname, enumsortorder;