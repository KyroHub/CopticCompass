CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create an index to speed up full-text search
CREATE INDEX IF NOT EXISTS coptic_documents_content_fts_idx 
ON public.coptic_documents 
USING GIN (to_tsvector('english', content));

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS match_coptic_documents;

-- Create a hybrid search function (vector + full-text search)
CREATE OR REPLACE FUNCTION match_coptic_documents (
  query_embedding vector(768),
  query_text text,
  match_count int DEFAULT 5,
  filter_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float,
  fts_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document.id,
    document.content,
    document.metadata,
    (1 - (document.embedding <=> query_embedding))::float AS similarity,
    ts_rank_cd(to_tsvector('english', document.content), plainto_tsquery('english', query_text))::float AS fts_score
  FROM public.coptic_documents document
  WHERE filter_metadata IS NULL 
     OR filter_metadata::text = '{}' 
     OR filter_metadata <@ document.metadata
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;