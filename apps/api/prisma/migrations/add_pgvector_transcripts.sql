-- =====================================================================
-- Migration: Add pgvector Extension and Transcript Content Table
-- Description: Migrate from MongoDB to PostgreSQL + pgvector for transcript storage
-- Date: 2025-12-08
-- =====================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================================
-- Alter TranscriptContent table to use proper vector column type
-- =====================================================================

-- Since Prisma creates the table with embedding as BYTEA, we need to:
-- 1. Drop the existing column
-- 2. Add it back as vector(1536)

-- Note: This assumes the table is created by Prisma migration first
-- If the table doesn't exist yet, Prisma will create it, then we modify it

DO $$
BEGIN
    -- Check if the TranscriptContent table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'TranscriptContent') THEN
        -- Drop the embedding column if it exists as BYTEA
        IF EXISTS (
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'TranscriptContent'
            AND column_name = 'embedding'
            AND data_type = 'bytea'
        ) THEN
            ALTER TABLE "TranscriptContent" DROP COLUMN IF EXISTS embedding;
        END IF;

        -- Add the embedding column as vector type if it doesn't exist
        IF NOT EXISTS (
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'TranscriptContent'
            AND column_name = 'embedding'
        ) THEN
            ALTER TABLE "TranscriptContent" ADD COLUMN embedding vector(1536);
        END IF;
    END IF;
END $$;

-- =====================================================================
-- Create Indexes for Full-Text Search and Vector Similarity
-- =====================================================================

-- Create GIN index for full-text search on fullText column
-- This enables fast text search queries
CREATE INDEX IF NOT EXISTS idx_transcript_content_fulltext_gin
ON "TranscriptContent"
USING gin(to_tsvector('english', "fullText"));

-- Create GIN index for trigram similarity search (for fuzzy matching)
CREATE INDEX IF NOT EXISTS idx_transcript_content_fulltext_trgm
ON "TranscriptContent"
USING gin("fullText" gin_trgm_ops);

-- Create IVFFlat index for vector similarity search
-- IVFFlat is more efficient than the default for large datasets
-- Lists parameter (100) is a good starting point for datasets with millions of vectors
DO $$
BEGIN
    -- Only create index if the embedding column exists as vector type
    IF EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'TranscriptContent'
        AND column_name = 'embedding'
        AND udt_name = 'vector'
    ) THEN
        -- Drop existing index if it exists
        DROP INDEX IF EXISTS idx_transcript_content_embedding_ivfflat;

        -- Create IVFFlat index for cosine distance
        CREATE INDEX idx_transcript_content_embedding_ivfflat
        ON "TranscriptContent"
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    END IF;
END $$;

-- =====================================================================
-- Create Helper Functions for Vector Search
-- =====================================================================

-- Function to search transcripts by semantic similarity
CREATE OR REPLACE FUNCTION search_transcripts_by_similarity(
    query_embedding vector(1536),
    organization_id_filter UUID,
    result_limit INTEGER DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    transcript_id UUID,
    meeting_id UUID,
    full_text TEXT,
    similarity FLOAT,
    word_count INTEGER,
    duration INTEGER,
    language VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.id,
        tc."transcriptId",
        tc."meetingId",
        tc."fullText",
        1 - (tc.embedding <=> query_embedding) AS similarity,
        tc."wordCount",
        tc.duration,
        tc.language
    FROM "TranscriptContent" tc
    WHERE
        tc."organizationId" = organization_id_filter
        AND tc.embedding IS NOT NULL
        AND 1 - (tc.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY tc.embedding <=> query_embedding
    LIMIT result_limit;
END;
$$;

-- Function to search transcripts by full-text search
CREATE OR REPLACE FUNCTION search_transcripts_by_text(
    search_query TEXT,
    organization_id_filter UUID,
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    transcript_id UUID,
    meeting_id UUID,
    full_text TEXT,
    rank FLOAT,
    word_count INTEGER,
    duration INTEGER,
    language VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.id,
        tc."transcriptId",
        tc."meetingId",
        tc."fullText",
        ts_rank(to_tsvector('english', tc."fullText"), plainto_tsquery('english', search_query)) AS rank,
        tc."wordCount",
        tc.duration,
        tc.language
    FROM "TranscriptContent" tc
    WHERE
        tc."organizationId" = organization_id_filter
        AND to_tsvector('english', tc."fullText") @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC
    LIMIT result_limit;
END;
$$;

-- Function to perform hybrid search (combining text and vector similarity)
CREATE OR REPLACE FUNCTION search_transcripts_hybrid(
    search_text TEXT,
    query_embedding vector(1536),
    organization_id_filter UUID,
    result_limit INTEGER DEFAULT 10,
    text_weight FLOAT DEFAULT 0.5,
    vector_weight FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id UUID,
    transcript_id UUID,
    meeting_id UUID,
    full_text TEXT,
    combined_score FLOAT,
    text_rank FLOAT,
    vector_similarity FLOAT,
    word_count INTEGER,
    duration INTEGER,
    language VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH text_results AS (
        SELECT
            tc.id,
            tc."transcriptId",
            tc."meetingId",
            tc."fullText",
            tc."wordCount",
            tc.duration,
            tc.language,
            ts_rank(to_tsvector('english', tc."fullText"), plainto_tsquery('english', search_text)) AS text_rank
        FROM "TranscriptContent" tc
        WHERE
            tc."organizationId" = organization_id_filter
            AND to_tsvector('english', tc."fullText") @@ plainto_tsquery('english', search_text)
    ),
    vector_results AS (
        SELECT
            tc.id,
            1 - (tc.embedding <=> query_embedding) AS similarity
        FROM "TranscriptContent" tc
        WHERE
            tc."organizationId" = organization_id_filter
            AND tc.embedding IS NOT NULL
    ),
    combined AS (
        SELECT
            COALESCE(t.id, v.id) AS id,
            t."transcriptId",
            t."meetingId",
            t."fullText",
            t."wordCount",
            t.duration,
            t.language,
            COALESCE(t.text_rank, 0) AS text_rank,
            COALESCE(v.similarity, 0) AS vector_similarity,
            (COALESCE(t.text_rank, 0) * text_weight + COALESCE(v.similarity, 0) * vector_weight) AS combined_score
        FROM text_results t
        FULL OUTER JOIN vector_results v ON t.id = v.id
    )
    SELECT
        c.id,
        c."transcriptId",
        c."meetingId",
        c."fullText",
        c.combined_score,
        c.text_rank,
        c.vector_similarity,
        c."wordCount",
        c.duration,
        c.language
    FROM combined c
    WHERE c.combined_score > 0
    ORDER BY c.combined_score DESC
    LIMIT result_limit;
END;
$$;

-- =====================================================================
-- Create Indexes for Performance Optimization
-- =====================================================================

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_transcript_content_org_created
ON "TranscriptContent" ("organizationId", "createdAt" DESC);

-- Index for filtering by meeting
CREATE INDEX IF NOT EXISTS idx_transcript_content_meeting_created
ON "TranscriptContent" ("meetingId", "createdAt" DESC);

-- Index for language-specific queries
CREATE INDEX IF NOT EXISTS idx_transcript_content_org_language
ON "TranscriptContent" ("organizationId", "language");

-- Partial index for transcripts with embeddings
CREATE INDEX IF NOT EXISTS idx_transcript_content_has_embedding
ON "TranscriptContent" ("organizationId", "createdAt" DESC)
WHERE embedding IS NOT NULL;

-- =====================================================================
-- Add Comments for Documentation
-- =====================================================================

COMMENT ON TABLE "TranscriptContent" IS 'Stores full transcript content with vector embeddings for semantic search. Replaces MongoDB storage.';
COMMENT ON COLUMN "TranscriptContent".embedding IS 'Vector embedding (1536 dimensions) for semantic similarity search using OpenAI ada-002 or similar models';
COMMENT ON COLUMN "TranscriptContent"."fullText" IS 'Complete transcript text, indexed for full-text search';
COMMENT ON COLUMN "TranscriptContent".segments IS 'JSON array of transcript segments with timestamps, speakers, and confidence scores';
COMMENT ON COLUMN "TranscriptContent".speakers IS 'JSON array of speaker information including speaker ID, name, and talk time';

-- =====================================================================
-- Performance Settings for pgvector
-- =====================================================================

-- Set maintenance work memory for index creation (session-level)
-- This helps with creating IVFFlat indexes efficiently
SET maintenance_work_mem = '512MB';

-- Configure pgvector index build parameters
-- These settings optimize index creation for better recall
SET ivfflat.probes = 10;  -- Number of lists to scan during search

-- =====================================================================
-- Grant Permissions (adjust based on your database users)
-- =====================================================================

-- Grant usage on vector type to application user (replace 'app_user' with your actual user)
-- GRANT USAGE ON SCHEMA vector TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- =====================================================================
-- Migration Completion Message
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE 'pgvector transcript migration completed successfully!';
    RAISE NOTICE 'Vector dimension: 1536 (OpenAI ada-002 compatible)';
    RAISE NOTICE 'Indexes created: Full-text (GIN), Vector similarity (IVFFlat), Composite indexes';
    RAISE NOTICE 'Helper functions available: search_transcripts_by_similarity, search_transcripts_by_text, search_transcripts_hybrid';
END $$;