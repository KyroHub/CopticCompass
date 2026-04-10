-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the table for holding Coptic lexicon and grammar data
CREATE TABLE IF NOT EXISTS public.coptic_documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Assuming 768 dimensions (common for Google/HF embeddings), adjust if using a different embedding model
  embedding VECTOR(768) 
);

-- Create an HNSW index to speed up vector similarity searches
CREATE INDEX IF NOT EXISTS coptic_documents_embedding_idx 
ON public.coptic_documents 
USING hnsw (embedding vector_ip_ops);

-- Set up Row Level Security (RLS)
ALTER TABLE public.coptic_documents ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated/anon users for queries
DROP POLICY IF EXISTS "Allow public read access to coptic documents" 
  ON public.coptic_documents;
CREATE POLICY "Allow public read access to coptic documents" 
  ON public.coptic_documents FOR SELECT USING (true);

-- Restrict inserts/updates to service role (Next.js server)
DROP POLICY IF EXISTS "Allow service role to manage documents" 
  ON public.coptic_documents;
CREATE POLICY "Allow service role to manage documents" 
  ON public.coptic_documents
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
