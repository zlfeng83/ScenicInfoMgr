-- =============================================================
-- Combined Vision Support Migration (MediaPipe & DashScope)
-- =============================================================

-- 1. Add per-scenic location filter toggle (default OFF)
ALTER TABLE scenic_spots
  ADD COLUMN IF NOT EXISTS enable_location_filter BOOLEAN DEFAULT false;

-- 2. Add embedding columns for different engines
ALTER TABLE attraction_images
  ADD COLUMN IF NOT EXISTS embedding_mp VECTOR(1024),
  ADD COLUMN IF NOT EXISTS embedding_dashscope VECTOR(1024);

-- 3. HNSW indices for embeddings
CREATE INDEX IF NOT EXISTS idx_images_embedding_mp
  ON attraction_images USING hnsw (embedding_mp vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_images_embedding_dashscope
  ON attraction_images USING hnsw (embedding_dashscope vector_cosine_ops);

-- 4. Scenic-scoped RPC for MediaPipe embeddings
CREATE OR REPLACE FUNCTION match_attraction_images_mp (
  query_embedding VECTOR(1024),
  p_scenic_id TEXT,
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 1,
  p_attraction_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  attraction_id TEXT,
  attraction_name TEXT,
  image_url TEXT,
  similarity FLOAT
)
LANGUAGE sql
AS $$
  SELECT
    ai.attraction_id,
    a.name AS attraction_name,
    ai.image_url,
    1 - (ai.embedding_mp <=> query_embedding) AS similarity
  FROM attraction_images ai
  JOIN attractions a ON ai.attraction_id = a.id
  WHERE ai.embedding_mp IS NOT NULL
    AND ai.scenic_id = p_scenic_id
    AND a.is_active = true
    AND (p_attraction_ids IS NULL OR ai.attraction_id = ANY(p_attraction_ids))
    AND 1 - (ai.embedding_mp <=> query_embedding) > match_threshold
  ORDER BY ai.embedding_mp <=> query_embedding
  LIMIT match_count;
$$;

-- 5. Scenic-scoped RPC for DashScope embeddings
CREATE OR REPLACE FUNCTION match_attraction_images_dashscope (
  query_embedding VECTOR(1024),
  p_scenic_id TEXT,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 1,
  p_attraction_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  attraction_id TEXT,
  attraction_name TEXT,
  image_url TEXT,
  similarity FLOAT
)
LANGUAGE sql
AS $$
  SELECT
    ai.attraction_id,
    a.name AS attraction_name,
    ai.image_url,
    1 - (ai.embedding_dashscope <=> query_embedding) AS similarity
  FROM attraction_images ai
  JOIN attractions a ON ai.attraction_id = a.id
  WHERE ai.embedding_dashscope IS NOT NULL
    AND ai.scenic_id = p_scenic_id
    AND a.is_active = true
    AND (p_attraction_ids IS NULL OR ai.attraction_id = ANY(p_attraction_ids))
    AND 1 - (ai.embedding_dashscope <=> query_embedding) > match_threshold
  ORDER BY ai.embedding_dashscope <=> query_embedding
  LIMIT match_count;
$$;

-- 6. Update existing CLIP RPC to also support scenic_id filtering and active status
CREATE OR REPLACE FUNCTION match_attraction_images (
  query_embedding VECTOR(512),
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 1,
  p_scenic_id TEXT DEFAULT NULL,
  p_attraction_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  attraction_id TEXT,
  attraction_name TEXT,
  image_url TEXT,
  similarity FLOAT
)
LANGUAGE sql
AS $$
  SELECT
    ai.attraction_id,
    a.name AS attraction_name,
    ai.image_url,
    1 - (ai.embedding <=> query_embedding) AS similarity
  FROM attraction_images ai
  JOIN attractions a ON ai.attraction_id = a.id
  WHERE ai.embedding IS NOT NULL
    AND (p_scenic_id IS NULL OR ai.scenic_id = p_scenic_id)
    AND a.is_active = true
    AND (p_attraction_ids IS NULL OR ai.attraction_id = ANY(p_attraction_ids))
    AND 1 - (ai.embedding <=> query_embedding) > match_threshold
  ORDER BY ai.embedding <=> query_embedding
  LIMIT match_count;
$$;
