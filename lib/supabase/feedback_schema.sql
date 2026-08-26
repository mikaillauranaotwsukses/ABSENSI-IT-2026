-- ============================================================
-- SQL MIGRATION FOR ABSENSI IT 26: FEEDBACK & ADVANCED REPORTING
-- Jalankan query ini di Supabase SQL Editor:
-- ============================================================

-- 1. Tambah kolom feedback_schema pada tabel event
ALTER TABLE event 
ADD COLUMN IF NOT EXISTS feedback_schema JSONB DEFAULT '[]'::jsonb;

-- 2. Buat tabel feedback untuk menyimpan respon evaluasi dari anggota
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    nrp VARCHAR(50) NOT NULL REFERENCES anggota(nrp) ON DELETE CASCADE,
    data_respons JSONB NOT NULL DEFAULT '{}'::jsonb,
    rating_overall NUMERIC(3, 1) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT feedback_event_nrp_unique UNIQUE (event_id, nrp)
);

-- 3. Nonaktifkan RLS pada tabel feedback agar server API route & panitia dapat mengakses bebas
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;

-- 4. Indexing untuk kecepatan pencarian laporan
CREATE INDEX IF NOT EXISTS idx_feedback_event_id ON feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_feedback_nrp ON feedback(nrp);
