# Brief Redesign UI — Absensi IT 26 (Dokumen Eksekusi Mandiri)

> **Cara pakai dokumen ini:** Tempel/lampirkan file ini ke sesi AI baru. Dokumen ini berisi
> semua konteks yang dibutuhkan (stack, brand, temuan audit, keputusan, instruksi teknis per file).
> AI tidak perlu bertanya ulang — cukup eksekusi sesuai urutan di bagian akhir.

---

## 0. Konteks Proyek (WAJIB dibaca dulu)

- **Nama:** `absensi-it-26` — sistem absensi digital anggota organisasi Mahasiswa S1 Teknologi Informasi angkatan 2026.
- **Stack:** Next.js **16.3.2** (App Router, React Server Components) · React **19.2.8** · Tailwind **v4** · TypeScript · Supabase (`@supabase/ssr`).
- **PENTING soal Next.js:** Ini Next.js versi baru dengan kemungkinan breaking changes. Baca `node_modules/next/dist/docs/` (khususnya `01-app`) sebelum menulis kode yang menyangkut font/layout/API. Jangan berasumsi dari memori training.
- **Perintah:** `npm run dev` (dev), `npm run build` (verifikasi), `npm run lint`.
- **Perangkat utama pengguna:** HP (untuk menampilkan & scan QR di lokasi acara). Mobile-first adalah prioritas.

### Peta file yang relevan
```
app/
  layout.tsx                          # root layout, font Inter di sini
  globals.css                         # semua util kustom (.tech-card, .btn-primary, glow, badge, animasi)
  HomePageClient.tsx                  # beranda member (profil, KPI, daftar event)  [9 emoji]
  login/page.tsx                      # login member (NRP + password)              [4 emoji]
  event/[id]/page.tsx                 # halaman detail event (server component)     [1 emoji]
  event/[id]/AbsensiForm.tsx          # form absensi 3-tab (form/QR/feedback)       [38 emoji]
  portal-it-admin/
    page.tsx                          # dashboard admin                            [7 emoji]
    scan/page.tsx                     # scan QR admin (html5-qrcode)                [7 emoji]
    events/page.tsx                   # list event admin                           [2 emoji]
    events/new/page.tsx               # buat event                                 [14 emoji]
    events/[id]/edit/EditEventForm.tsx                                             [9 emoji]
    events/DeleteEventButton.tsx                                                   [1 emoji]
    absensi/[id]/AbsensiReportClient.tsx  # laporan absensi + export PDF            [42 emoji]
    login/page.tsx                                                                 [2 emoji]
components/
  ChangePasswordModal.tsx             # modal ganti password                       [4 emoji]
  MemberQRCard.tsx                    # kartu tiket QR digital                     [2 emoji]
  FormBuilder.tsx                     # builder skema form (admin)                 [12 emoji]
```
Total: **~154 emoji di 15 file**.

---

## 1. Design Read & Aturan Main

**Design read:** UI produk (bukan landing page) untuk organisasi mahasiswa IT, bahasa visual **dark-tech / glassmorphism**, brand IFEST 2026.

**Mode redesign:** `redesign-preserve` — brand disengaja, jadi **rapikan & modernkan, jangan rombak total.**

**Dial:** `VARIANCE 4 / MOTION 4 / DENSITY 5` (utamakan kerapian & fungsi, tahan diri dari flourish).

**Brand tokens (JANGAN diubah nilainya):**
- Primary blue: `#214afe` (hover `#0088ff`)
- Secondary amber: `#ffc878`
- Tertiary pink: `#ff0055`
- Background gelap: `#090d16`
- Teks: `#f8fafc` / slate-400 untuk sekunder

**Bahasa:** Semua teks UI dalam **Bahasa Indonesia**. Jangan diterjemahkan ke Inggris.

---

## 2. Keputusan yang Sudah Diambil (jangan ditawar ulang)

1. **Cakupan:** Polish aman + refresh visual. Fungsi & brand tetap.
2. **Emoji → Icon library Phosphor** (`@phosphor-icons/react`). Konsisten lintas perangkat.
3. **Font:** Inter → **Geist** via `next/font`.
4. **Spinner generik → skeleton loader** yang menyerupai layout final.

---

## 3. Yang TIDAK BOLEH diubah (aturan preservasi)

- Struktur URL / slug route.
- Nama & urutan field form (dipakai sebagai key di Supabase: `data_respons[field.label]` — mengubahnya merusak data).
- Nama tabel/kolom Supabase (`event`, `absensi`, `feedback`, `nrp`, `is_form_filled`, `is_qr_scanned`, `rating_overall`, dll).
- Logo / wordmark, favicon.
- Nilai brand token warna.
- Logika autentikasi, upsert, kondisi/branching field, upload file.
- Nilai `member.nrp`, format QR (`JSON.stringify({event_id, nrp})`).

> Prinsip: ini perubahan **presentasional**. Kalau ragu apakah sesuatu memengaruhi data/logika, JANGAN ubah.

---

## 4. FONDASI (kerjakan paling awal)

### 4.1 Install Phosphor
```bash
npm install @phosphor-icons/react
```
- Verifikasi terpasang: `ls node_modules/@phosphor-icons/react/dist`.
- Pola pakai: `import { Key, CalendarBlank } from '@phosphor-icons/react';`
- **Konvensi global:** pilih SATU `weight` untuk seluruh proyek. Rekomendasi `weight="bold"` untuk aksen, `"regular"` untuk ikon netral. Ukuran default `size={18}` (inline teks) / `size={20-24}` (tombol/header).
- **Semua ikon Phosphor butuh Client Component.** File dengan `'use client'` aman. Untuk server component (`app/event/[id]/page.tsx`, `app/portal-it-admin/page.tsx` bila server), impor ikon tetap boleh karena Phosphor mengekspor komponen yang bisa dirender di RSC; jika muncul error runtime, bungkus ikon di komponen kecil `'use client'` atau pakai varian `/dist/ssr`. Cek dulu, jangan asumsi.

### 4.2 Ganti Font Inter → Geist
- Di `app/layout.tsx`, ganti `import { Inter } from 'next/font/google'` → Geist.
- Next.js 16: Geist tersedia via `next/font/google` (`import { Geist, Geist_Mono } from 'next/font/google'`). **Verifikasi di `node_modules/next/dist/docs/` dulu** kalau ragu API-nya.
- Pertahankan CSS variable pattern: `const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })`.
- Update `globals.css` baris `--font-inter` & `font-family` agar menunjuk ke variabel Geist. Ganti juga kelas `font-sans` di `<body>`.
- Untuk angka/mono (NRP, kode, timestamp) sudah pakai `font-mono` — arahkan ke Geist Mono.

### 4.3 Buat Skeleton Loader
- Buat komponen `components/Skeleton.tsx` (`'use client'`): blok `bg-slate-800/60 rounded-xl animate-pulse` dengan varian bentuk (card, baris teks, tombol).
- Hormati reduced-motion: pulse mati saat `prefers-reduced-motion`.

---

## 5. GLOBAL (globals.css & layout)

- [ ] **`min-h-screen` → `min-h-[100dvh]`** di SEMUA `<main>`/wrapper full-height. Lokasi diketahui: `HomePageClient.tsx:70`, `login/page.tsx:41`, `event/[id]/page.tsx:25`. Grep sisanya: `min-h-screen`.
- [ ] **Kurangi `glow-*`:** sisakan glow hanya di logo brand utama (hero home & login). Hapus dari tombol biasa, badge, avatar, tab. (Kelas glow ada di `globals.css:247-250`.)
- [ ] **Kurangi `gradient-text`:** maksimal 1 pemakaian (brand header). Sisanya → teks solid putih + bobot.
- [ ] **Radius konsisten:** pilih skala tunggal. Rekomendasi: kartu `rounded-2xl`, tombol/input `rounded-xl`, pill/badge `rounded-full`. Rapikan pemakaian `rounded-3xl` liar.

---

## 6. GANTI EMOJI → IKON (per file, detail)

> Aturan: setiap emoji dekoratif diganti komponen Phosphor. Emoji yang bagian dari string data
> Supabase JANGAN diubah. Untuk ikon di dalam `<span>` inline, beri `className` ukuran + warna
> yang sama dengan konteks (mis. `className="text-blue-300"`).

### `app/HomePageClient.tsx`
| Lokasi | Emoji | Ganti |
|---|---|---|
| Tombol ganti password | 🔑 | `Key` |
| Badge anggota "✓" | ✓ | `CheckCircle` (weight fill) |
| Tombol masuk / login | 🔑 | `Key` |
| Header daftar acara | 📅 | `CalendarBlank` |
| Empty state | 📋 | `Tray` atau `CalendarX` |
| Status card: form | 📝 | `NotePencil` |
| Status card: QR | 📱 | `DeviceMobile` |
| Status card: feedback | ⭐ | `Star` |
| Panah CTA `→` | → | `ArrowRight` (atau biarkan `→`, konsisten saja) |

### `app/login/page.tsx`
| Emoji | Ganti |
|---|---|
| 🔑 (masuk) | `Key` |
| 💡 (info login) | `Lightbulb` |
| 🔐 (link admin) | `LockKey` |
| SVG mata tangan | `Eye` / `EyeSlash` |

### `app/event/[id]/page.tsx`
| Emoji/SVG | Ganti |
|---|---|
| 🔒 (absensi ditutup) | `LockSimple` |
| SVG panah kembali | `ArrowLeft` |
| SVG broadcast | `Megaphone` |

### `app/event/[id]/AbsensiForm.tsx` (paling banyak)
| Konteks | Emoji | Ganti |
|---|---|---|
| Tab Form | 📝 | `NotePencil` |
| Tab QR | 📱 | `DeviceMobile` |
| Tab Feedback | ⭐ | `Star` |
| Sukses absensi | ✅ | `CheckCircle` (fill, emerald) |
| Belum login | 🔒 | `LockSimple` |
| Peringatan sudah isi | ⚠️ | `Warning` |
| Edit jawaban | ✏️ | `PencilSimple` |
| Info field | 💡 | `Lightbulb` |
| Komentar/ulasan | 💬 | `ChatCircle` |
| Sukses feedback | 🎉 | `Confetti` |
| Hint klik bintang | 👆 | `HandPointing` (atau hapus) |
| Rating 5/4/3/2/1 (🌟👍👌👎⚠️) | — | Rating text saja + ikon `Star` fill count. Emoji ekspresi boleh dihapus, ganti label teks. |
| Spinner auth-loading | SVG spin | **Skeleton** (lihat 4.3) |
| Bintang ★/☆ | — | `Star` (weight `fill` vs `regular`) — opsional tapi lebih konsisten |

### `components/MemberQRCard.tsx`
| Emoji/SVG | Ganti |
|---|---|
| ⚡ (official pass) | `Lightning` |
| ⏳ (belum discan) | `Hourglass` |
| ✓ + SVG centang (sudah hadir) | `CheckCircle` |

### `components/ChangePasswordModal.tsx`
| Emoji | Ganti |
|---|---|
| 🔐 | `LockKey` |
| 🙈 / 👁️ | `EyeSlash` / `Eye` |
| ⚠️ | `Warning` |

### File admin (kerjakan setelah member selesai)
- `app/portal-it-admin/page.tsx` (7), `scan/page.tsx` (7), `events/page.tsx` (2), `events/new/page.tsx` (14), `events/[id]/edit/EditEventForm.tsx` (9), `events/DeleteEventButton.tsx` (1), `absensi/[id]/AbsensiReportClient.tsx` (42), `login/page.tsx` (2), `components/FormBuilder.tsx` (12).
- Pendekatan sama: baca file, petakan tiap emoji ke ikon Phosphor sesuai makna (`Trash`, `PencilSimple`, `Plus`, `QrCode`, `DownloadSimple`, `Users`, `ChartBar`, `Gear`, `MagnifyingGlass`, dsb).
- **`AbsensiReportClient.tsx` (42 emoji)** paling padat — hati-hati, ada logika export PDF (`jspdf`). Ubah HANYA tampilan, jangan sentuh isi string yang masuk ke PDF kecuali itu emoji dekoratif di UI.

---

## 7. DETAIL KECIL (tell minor)

- [ ] Hapus label **"Step 1 of 3" / "Step 3 of 3"** (`AbsensiForm.tsx`) atau ganti progress indicator halus (mis. 3 titik/garis).
- [ ] **Pulsing dot** (`animate-pulse` di badge): simpan hanya untuk status semantik nyata ("Sedang Buka"/"Sedang Berlangsung"). Hapus dari badge dekoratif.
- [ ] Audit copy: hindari campur register mono + marketing dalam satu blok.

---

## 8. VERIFIKASI (wajib sebelum selesai)

1. `npm run build` — harus sukses tanpa error TypeScript/lint.
2. Cek visual di **mobile** (viewport ~375px) dan desktop.
3. Cek di **light & dark** — proyek ini dark-locked, pastikan tidak ada section yang membalik tema.
4. Pastikan tidak ada emoji tersisa: `grep -rP '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}]' app components` (kecuali yang memang sengaja dipertahankan, mis. bintang rating jika diputuskan tetap).
5. Uji fungsi kritikal manual: login → buka event → isi form → tampilkan QR → isi feedback → ganti password. Tidak boleh ada regresi.

---

## 9. URUTAN EKSEKUSI

1. **Fondasi** (§4): install Phosphor → swap font → buat Skeleton.
2. **Global** (§5): `100dvh`, kurangi glow/gradient, radius.
3. **Surface member** (§6): `HomePageClient` → `login` → `event/[id]/page` → `AbsensiForm` → `MemberQRCard` → `ChangePasswordModal`.
4. **Surface admin** (§6): dashboard → scan → events (list/new/edit/delete) → `AbsensiReportClient` → `FormBuilder` → admin login.
5. **Detail kecil** (§7).
6. **Verifikasi** (§8).

> Kerjakan bertahap & commit per kelompok (mis. "fondasi", "member surfaces", "admin surfaces") agar mudah di-review dan di-rollback. Jangan commit tanpa diminta user.

---

## 10. Yang Sudah Bagus (preservasi, jangan "diperbaiki")

- Tema gelap koheren + satu sistem aksen terkunci.
- Kontras placeholder sudah WCAG AA (`#94a3b8`, `globals.css:223-226`).
- `prefers-reduced-motion` sudah ditangani (`globals.css:253-273`).
- Target sentuh 44px pada tombol rating/skala feedback.
- Struktur data & branching form sudah matang.

