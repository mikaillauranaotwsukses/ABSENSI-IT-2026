# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary User 1: Anggota / Mahasiswa IT 2026**
  - Situation: Mengikuti kegiatan/event angkatan (Bonding, Seminar, Rapat Divisi, Workshop, dsb.).
  - Jobs to be Done: Login mandiri dengan NRP, melengkapi form registrasi/absensi dinamis, menampilkan Digital QR Ticket Pass di lokasi acara, dan mengirimkan feedback/evaluasi acara (rating bintang/skala beserta catatan masukan).
  
- **Primary User 2: Panitia Acara / Admin Portal IT**
  - Situation: Mengelola logistik absensi sebelum, saat, dan sesudah acara berlangsung.
  - Jobs to be Done: Membuat event baru dengan Form & Feedback Builder kustom, menduplikasi susunan form dari acara sebelumnya, memindai QR code peserta secara real-time di lokasi, memantau daftar anggota yang belum hadir (mode sweeping), serta mengunduh rekap laporan PDF & CSV (absensi + feedback).

## Product Purpose

Platform web presensi dan evaluasi terpadu untuk Angkatan Teknologi Informasi 2026 yang menyatukan seluruh alur kehadiran mulai dari pendaftaran data, check-in QR code di lokasi, hingga evaluasi kepuasan peserta ke dalam satu ekosistem yang cepat, rapi, dan terstruktur.

## Positioning

Sistem absensi berbasis event yang tidak hanya mencatat status hadir/tidak hadir, melainkan mengintegrasikan dynamic form generator, digital festival ticket pass (QR code interaktif), mode sweeping panitia, serta evaluasi rating & masukan peserta yang terikat secara berpasangan (*side-by-side*) dalam satu platform real-time.

## Operating Context

- Digunakan secara mobile oleh anggota saat check-in di venue acara maupun desktop untuk pengisian form & laporan admin.
- Beroperasi bersama Supabase (PostgreSQL + Auth + Storage) untuk persistensi data absensi, QR code scanner, dan manajemen file lampiran.

## Capabilities and Constraints

- **Dynamic Form & Feedback Builder**: Admin dapat membuat pertanyaan teks, pilihan ganda, upload file, rating bintang (1–5), dan skala nilai (1–10) dengan dukungan branching condition.
- **Integrated Feedback Sub-units**: Setiap rating dan skala memiliki sub-unit teks catatan/alasan ulasan yang tersusun bersebelahan di sisi admin dan form peserta.
- **Sweeping & Multi-filter Roster**: Filter multi-dimensi (Status Form, Status Scan QR, Prodi, Jawaban Khusus) untuk pelacakan peserta yang belum hadir.
- **Exporting**: Laporan PDF otomatis (Laporan Kehadiran & Laporan Evaluasi Feedback) dan ekspor CSV.
- **Identity & Security**: Akses portal anggota berbasis NRP dengan kewajiban ganti password saat login pertama kali, serta portal admin terpisah dengan PIN keamanan.

## Brand Commitments

- **Identitas**: Teknologi Informasi 2026 / IFEST 2026.
- **Visual Language**: Tech-forward Minimalism (Palet Biru Elektrik `#214afe`, Aksen Warm Amber `#ffc878`, latar belakang animated tech grid, elevasi kartu modern).
- **Aset Resmi**: Logo Resmi IT 26 (`/favicon.ico`).

## Evidence on Hand

- Database schema & tabel terverifikasi di Supabase: `anggota`, `event`, `absensi`, `feedback`.
- Design token referensi: [DESIGN-itfest.md](DESIGN-itfest.md).
- Aset visual resmi: `public/favicon.ico`, `public/logo.png`.

## Product Principles

1. **Seamless Event Journey**: Alur peserta mulai dari Form -> QR Ticket -> Feedback tersusun dalam 3 langkah yang runtut dan minim friksi.
2. **Unified Feedback Intelligence**: Setiap skor kuantitatif (bintang/skala) selalu berpasangan dengan masukan kualitatif peserta agar panitia mendapatkan konteks evaluasi yang utuh.
3. **High-Speed Operations for Committees**: Panitia dapat menyalin struktur event sebelumnya dalam satu klik, melakukan sweeping kehadiran secara instan, dan mencetak laporan resmi siap pakai.
4. **Tech-Forward Visual Excellence**: Antarmuka responsif dengan standar estetika IFEST 2026 yang modern, presisi, dan profesional.
