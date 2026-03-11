-- ============================================================
-- Shadowing English — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your tables.
-- ============================================================

-- 1. Dialogues
CREATE TABLE dialogues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Sentences
CREATE TABLE sentences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dialogue_id uuid NOT NULL REFERENCES dialogues(id) ON DELETE CASCADE,
  text text NOT NULL,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Sessions
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dialogue_id uuid NOT NULL REFERENCES dialogues(id) ON DELETE CASCADE,
  avg_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. Sentence Results
CREATE TABLE sentence_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sentence_id uuid NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  accuracy numeric DEFAULT 0,
  completeness numeric DEFAULT 0,
  fluency numeric DEFAULT 0,
  confidence numeric DEFAULT 0,
  overall numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dialogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_results ENABLE ROW LEVEL SECURITY;

-- Allow all access (personal use)
CREATE POLICY "Allow all dialogues" ON dialogues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all sentences" ON sentences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all sentence_results" ON sentence_results FOR ALL USING (true) WITH CHECK (true);
