# 🤝 Panduan Kolaborasi & Migrasi Database Supabase

Dokumen ini berisi petunjuk cara berkolaborasi dan melakukan migrasi database untuk project **ABSENSI IT 26**.

---

## Cara 1: Menggunakan 1 Database Supabase Bersama (Sangat Direkomendasikan ⭐)

Jika Anda dan teman Anda ingin mengerjakan aplikasi dengan **data yang sama**:

1. **Undang Teman ke Supabase Project**:
   - Buka [Supabase Dashboard](https://supabase.com/dashboard) → Pilih project `vomaluikqvcryocefoke`.
   - Masuk ke **Organization Settings** → **Members** → Klik **Invite Member**.
   - Masukkan email Supabase teman Anda.

2. **Teman Melakukan Clone Repository**:
   ```bash
   git clone https://github.com/mikaillauranaotwsukses/ABSENSI-IT-2026.git
   cd ABSENSI-IT-2026
   npm install
   ```

3. **Salin File `.env.local`**:
   Teman Anda membuat file `.env.local` di folder utama project dengan isi:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://vomaluikqvcryocefoke.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...
   ```

4. **Jalankan Aplikasi**:
   ```bash
   npm run dev
   ```
   *Keunggulan: Tidak perlu membuat database baru, data event & absensi langsung tersinkronisasi realtime.*

---

## Cara 2: Jika Teman Ingin Membuat Database Supabase Terpisah (Mandiri)

Jika teman Anda ingin memiliki database dan project Supabase sendiri:

### Langkah 1: Buat Project Baru di Supabase
Teman Anda membuat project baru di [Supabase](https://supabase.com).

### Langkah 2: Jalankan Script SQL Schema
Buka **SQL Editor** di Supabase teman Anda, salin kode SQL berikut lalu klik **Run**:

```sql
-- 1. Tabel Anggota
CREATE TABLE IF NOT EXISTS anggota (
  nrp VARCHAR PRIMARY KEY,
  nama VARCHAR NOT NULL,
  program_studi VARCHAR NOT NULL
);

-- 2. Tabel Event
CREATE TABLE IF NOT EXISTS event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_event VARCHAR NOT NULL,
  deskripsi TEXT DEFAULT '',
  status BOOLEAN DEFAULT true,
  form_schema JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabel Absensi
CREATE TABLE IF NOT EXISTS absensi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES event(id) ON DELETE CASCADE,
  nrp VARCHAR REFERENCES anggota(nrp) ON DELETE CASCADE,
  data_respons JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, nrp)
);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Public select anggota" ON anggota FOR SELECT USING (true);
CREATE POLICY "Public insert/update/delete anggota" ON anggota FOR ALL USING (true);

CREATE POLICY "Public select event" ON event FOR SELECT USING (true);
CREATE POLICY "Public insert/update/delete event" ON event FOR ALL USING (true);

CREATE POLICY "Public select absensi" ON absensi FOR SELECT USING (true);
CREATE POLICY "Public insert/update/delete absensi" ON absensi FOR ALL USING (true);

-- 6. Storage Buckets (File Upload & Info Photos)
INSERT INTO storage.buckets (id, name, public) VALUES ('event-assets', 'event-assets', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public event-assets select" ON storage.objects FOR SELECT USING (bucket_id = 'event-assets');
CREATE POLICY "Public event-assets insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-assets');

INSERT INTO storage.buckets (id, name, public) VALUES ('absensi-files', 'absensi-files', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public absensi-files select" ON storage.objects FOR SELECT USING (bucket_id = 'absensi-files');
CREATE POLICY "Public absensi-files insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'absensi-files');
```

### Langkah 3: Import 140 Data Anggota IT
Jalankan script Python yang ada di folder project:
```bash
python import_anggota.py
```

### Langkah 4: Buat Akun Admin
Masuk ke Supabase Dashboard → **Authentication** → **Users** → **Add User** → **Create User**:
- Masukkan Email Admin & Password pilihan teman Anda.

### Langkah 5: Buat `.env.local`
Isi file `.env.local` teman Anda dengan `URL` & `ANON_KEY` dari project Supabase mereka.
