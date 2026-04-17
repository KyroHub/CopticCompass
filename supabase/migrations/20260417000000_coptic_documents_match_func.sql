-- Migration: Create match_coptic_documents RPC for vector similarity search

CREATE OR REPLACE FUNCTION match_coptic_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    coptic_documents.id,
    coptic_documents.content,
    coptic_documents.metadata,
    1 - (coptic_documents.embedding <=> query_embedding) AS similarity
  FROM coptic_documents
  WHERE 1 - (coptic_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY coptic_documents.embedding <=> query_embedding
  LIMIT match_count;
$$;
