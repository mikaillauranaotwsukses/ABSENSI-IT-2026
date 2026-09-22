# Rencana Perbaikan UI — Absensi IT 26

> Hasil audit dengan skill `design-taste-frontend` (mode: **redesign-preserve**).
> Brand IFEST 2026 dipertahankan (biru `#214afe` + amber `#ffc878`, tema gelap glassmorphism).
> Dial: `VARIANCE 4 / MOTION 4 / DENSITY 5` — ini UI produk, bukan landing page, jadi utamakan kerapian & fungsi.

---

## Ringkasan Keputusan

- **Cakupan:** Polish aman + refresh visual. Fungsi & brand tetap.
- **Emoji:** Diganti glyph icon library **Phosphor** (`@phosphor-icons/react`) yang konsisten lintas perangkat.
- **Total dampak:** ~154 emoji di 15 file, + install 1 dependency, + swap font aplikasi.

---

## A. Fondasi (dikerjakan lebih dulu)

- [ ] **Install icon library** `@phosphor-icons/react` (belum terpasang). Set `strokeWidth`/`weight` global konsisten (`weight="bold"` atau `"regular"` — pilih satu).
- [ ] **Ganti font** dari `Inter` → `Geist` via `next/font`. Inter adalah default AI-tell; Geist lebih sesuai brand tech dan tetap netral/terbaca.
- [ ] **Buat komponen skeleton loader** yang bentuknya mengikuti layout final (menggantikan spinner bulat generik).

## B. Perbaikan Global (CSS & Layout)

- [ ] **`min-h-screen` → `min-h-[100dvh]`** di semua halaman (home, login, event, admin). Ini bug nyata di mobile Safari — layout melompat saat address bar muncul. Penting karena HP adalah perangkat utama untuk scan QR.
- [ ] **Kurangi efek `glow-*`** (blue/amber). Simpan hanya untuk elemen yang benar-benar butuh penekanan (mis. logo utama), bukan di setiap tombol & badge.
- [ ] **Kurangi `gradient-text`** pada H1 → andalkan hierarki bobot + warna, bukan gradasi. Sisakan maksimal 1 pemakaian di brand header.
- [ ] Verifikasi satu skala corner-radius konsisten (saat ini campur `rounded-xl` / `rounded-2xl` / `rounded-3xl`).

## C. Ganti Emoji → Icon Phosphor (per file)

| File | Emoji saat ini | Ganti dengan (Phosphor) |
|---|---|---|
| `app/HomePageClient.tsx` (9) | 🔑 📅 📱 ⭐ 📝 ✓ ⏳ 📋 → | `Key`, `CalendarBlank`, `DeviceMobile`, `Star`, `NotePencil`, `CheckCircle`, `Hourglass`, `Tray` |
| `app/login/page.tsx` (4) | 🔑 💡 🔐 → | `Key`, `Lightbulb`, `LockKey` |
| `app/event/[id]/page.tsx` (1) | 🔒 → | `LockSimple` |
| `app/event/[id]/AbsensiForm.tsx` (38) | 📝 📱 ⭐ ⚠️ ✅ 🔒 ✏️ 💬 🎉 👆 🌟 👍 👌 👎 → | `NotePencil`, `DeviceMobile`, `Star`, `Warning`, `CheckCircle`, `LockSimple`, `PencilSimple`, `ChatCircle`, `Confetti`, ikon status rating |
| `components/MemberQRCard.tsx` (2) | ⚡ ⏳ → | `Lightning`, `Hourglass` |
| `components/ChangePasswordModal.tsx` (4) | 🔐 🙈 👁️ ⚠️ → | `LockKey`, `EyeSlash`, `Eye`, `Warning` |
| `components/FormBuilder.tsx` (12) | (admin) | ikon sesuai konteks |
| `app/portal-it-admin/page.tsx` (7) | (admin) | ikon sesuai konteks |
| `app/portal-it-admin/scan/page.tsx` (7) | (admin) | ikon sesuai konteks |
| `app/portal-it-admin/events/*` (17) | (admin) | ikon sesuai konteks |
| `app/portal-it-admin/absensi/[id]/AbsensiReportClient.tsx` (42) | (admin) | ikon sesuai konteks |

> Catatan: rating bintang (★/☆) di feedback boleh tetap karakter bintang **atau** diganti `Star`/`StarHalf` Phosphor (weight fill vs regular) supaya konsisten dengan sisa UI.

## D. State UI (loading / error / empty)

- [ ] **Auth-loading** (`AbsensiForm`): ganti spinner bulat → skeleton card yang menyerupai layout tab & form.
- [ ] **Empty state** home ("Belum Ada Event"): ganti emoji 📋 → ikon `Tray`/`CalendarX`, komposisi tetap.
- [ ] Error state sudah oke — cukup ganti ⚠️ → `Warning`.

## E. Ikon SVG Tangan → Icon Library

- [ ] `app/login/page.tsx`: toggle mata password (SVG tangan) → `Eye`/`EyeSlash` Phosphor.
- [ ] `app/event/[id]/page.tsx`: ikon panah "kembali" & ikon broadcast → `ArrowLeft`, `Megaphone`.
- [ ] `components/MemberQRCard.tsx`: ikon centang → `Check` Phosphor.
- [ ] Spinner tombol (border animate-spin) boleh tetap (murni CSS, bukan SVG tangan).

## F. Detail Kecil (tell minor)

- [ ] Label **"Step 1 of 3" / "Step 3 of 3"** di form → hapus atau ganti indikator progres yang lebih halus.
- [ ] **Titik berdenyut (pulsing dot)** di badge → simpan hanya untuk status semantik nyata (mis. "Sedang Buka"), bukan hiasan.
- [ ] Audit teks: rapikan copy yang campur register (mono + marketing).

---

## Yang TIDAK diubah (sudah bagus / preservasi)

- Tema gelap koheren + satu sistem aksen terkunci.
- Kontras placeholder sudah WCAG AA (`#94a3b8`).
- `prefers-reduced-motion` sudah ditangani di `globals.css`.
- Target sentuh 44px pada tombol rating/skala.
- **Struktur URL, label nav, nama field form, logo/wordmark** — tidak diubah (aturan preservasi redesign; berdampak ke SEO/analitik/hafalan pengguna).

---

## Urutan Eksekusi yang Disarankan

1. Fondasi (A) — install Phosphor, swap font, buat skeleton.
2. Global CSS/layout (B) — `100dvh`, kurangi glow/gradient.
3. Surface member (C/D/E) — home → login → event → form → QR → modal.
4. Surface admin (C) — dashboard, scan, events, laporan.
5. Detail kecil (F) + verifikasi `npm run build` & cek di light/dark + mobile.
