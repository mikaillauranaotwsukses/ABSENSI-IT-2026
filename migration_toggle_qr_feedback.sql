-- ============================================================
-- MIGRASI: Tambah Fitur Toggle QR & Feedback per Event
-- Buka Supabase Dashboard -> Project vomaluikqvcryocefoke -> SQL Editor
-- Link langsung: https://supabase.com/dashboard/project/vomaluikqvcryocefoke/sql/new
-- ============================================================

-- Gunakan schema public."event" dengan tanda kutip dua (karena 'event' adalah reserved keyword di PostgreSQL)
ALTER TABLE public."event" 
  ADD COLUMN IF NOT EXISTS is_qr_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_feedback_enabled BOOLEAN DEFAULT true;

-- Pastikan event yang sudah ada bernilai true secara default
UPDATE public."event" 
SET is_qr_enabled = true 
WHERE is_qr_enabled IS NULL;

UPDATE public."event" 
SET is_feedback_enabled = true 
WHERE is_feedback_enabled IS NULL;
