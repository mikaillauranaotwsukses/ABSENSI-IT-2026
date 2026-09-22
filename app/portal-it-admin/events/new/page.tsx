'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormField, Event } from '@/lib/types';
import FormBuilder from '@/components/FormBuilder';
import Link from 'next/link';
import {
  ArrowLeft, Lightning, ClipboardText, NotePencil, Star, ListBullets, ArrowRight,
  DeviceMobile, Copy, Check, Warning,
} from '@phosphor-icons/react';

import {
  parseEventConfig,
  cleanEventDeskripsi,
} from '@/lib/eventConfig';

export const dynamic = 'force-dynamic';

type BuilderTab = 'form' | 'feedback';

// ── PRESET TEMPLATES ──────────────────────────────────────────
const PRESET_TEMPLATES: Record<string, {
  name: string;
  icon: string;
  is_qr_enabled: boolean;
  is_feedback_enabled: boolean;
  form: FormField[];
  feedback: FormField[];
}> = {
  recruitment_panitia: {
    name: 'Open Recruitment Panitia (Batas Kuota Divisi)',
    icon: '👥',
    is_qr_enabled: false,
    is_feedback_enabled: false,
    form: [
      {
        label: 'Pilihan Divisi Utama',
        type: 'select',
        options: [
          'Divisi Acara',
          'Divisi Perlengkapan & Logistik',
          'Divisi Publikasi & Dokumentasi (Pubdok)',
          'Divisi Hubungan Masyarakat (Humas)',
          'Divisi Konsumsi',
          'Divisi Sponsorship & Dana Usaha',
        ],
        required: true,
        enable_quota: true,
        option_quotas: {
          'Divisi Acara': 10,
          'Divisi Perlengkapan & Logistik': 8,
          'Divisi Publikasi & Dokumentasi (Pubdok)': 6,
          'Divisi Hubungan Masyarakat (Humas)': 6,
          'Divisi Konsumsi': 5,
          'Divisi Sponsorship & Dana Usaha': 5,
        },
      },
      {
        label: 'Pilihan Divisi Alternatif',
        type: 'select',
        options: [
          'Divisi Acara',
          'Divisi Perlengkapan & Logistik',
          'Divisi Publikasi & Dokumentasi (Pubdok)',
          'Divisi Hubungan Masyarakat (Humas)',
          'Divisi Konsumsi',
          'Divisi Sponsorship & Dana Usaha',
        ],
        required: false,
      },
      {
        label: 'Alasan & Motivasi Mendaftar Divisi Tersebut',
        type: 'textarea',
        required: true,
      },
      {
        label: 'Pengalaman Organisasi / Kepanitiaan Sebelumnya',
        type: 'textarea',
        required: false,
      },
      {
        label: 'Nomor WhatsApp Aktif',
        type: 'text',
        required: true,
      },
      {
        label: 'Link Portofolio / CV (Google Drive)',
        type: 'text',
        required: false,
      },
    ],
    feedback: [],
  },
  pendataan_lomba: {
    name: 'Pendataan Lomba & Prestasi',
    icon: '🏆',
    is_qr_enabled: false,
    is_feedback_enabled: false,
    form: [
      {
        label: 'Nama Tim / Nama Peserta',
        type: 'text',
        required: true,
      },
      {
        label: 'Nama Kompetisi / Lomba',
        type: 'text',
        required: true,
      },
      {
        label: 'Penyelenggara / Universitas',
        type: 'text',
        required: true,
      },
      {
        label: 'Kategori / Cabang Lomba',
        type: 'select',
        options: [
          'UI/UX Design',
          'Competitive Programming',
          'Web / Mobile App Development',
          'Hackathon & AI Solution',
          'Data Science & Analytics',
          'Capture The Flag (CTF) / Cyber Security',
          'Karya Tulis Ilmiah / Business Plan',
          'Lainnya',
        ],
        required: true,
      },
      {
        label: 'Daftar Anggota Tim (NRP & Nama)',
        type: 'textarea',
        required: true,
      },
      {
        label: 'Link Dokumen / Bukti Registrasi Lomba',
        type: 'text',
        required: false,
      },
      {
        label: 'Kontak Ketua Tim (Nomor WhatsApp Aktif)',
        type: 'text',
        required: true,
      },
    ],
    feedback: [],
  },
  kuesioner_merch: {
    name: 'Pendataan Merch & Jaket Angkatan',
    icon: '👕',
    is_qr_enabled: false,
    is_feedback_enabled: false,
    form: [
      {
        label: 'Ukuran Jaket / Kaos',
        type: 'select',
        options: ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
        required: true,
      },
      {
        label: 'Nama Punggung / Custom Bordir (Maks. 12 Karakter)',
        type: 'text',
        required: true,
      },
      {
        label: 'Pilihan Varian / Warna',
        type: 'radio',
        options: ['Navy Blue IT 26 (Official)', 'Solid Black Edition', 'Misty Grey'],
        required: true,
      },
      {
        label: 'Bukti Pembayaran / Transfer DP',
        type: 'file',
        required: true,
      },
      {
        label: 'Catatan Tambahan',
        type: 'textarea',
        required: false,
      },
    ],
    feedback: [],
  },
  gathering: {
    name: 'Acara Bonding / Makrab (Tiket QR)',
    icon: '🎟️',
    is_qr_enabled: true,
    is_feedback_enabled: true,
    form: [
      {
        label: 'Status Kehadiran',
        type: 'radio',
        options: ['Hadir di Lokasi', 'Izin Tidak Bisa Hadir'],
        required: true,
      },
      {
        label: 'Alasan Tidak Hadir (Jika Izin)',
        type: 'textarea',
        required: false,
        condition: { field_label: 'Status Kehadiran', operator: 'equals', value: 'Izin Tidak Bisa Hadir' },
      },
      {
        label: 'Ukuran Kaos / Baju Acara',
        type: 'select',
        options: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
        required: true,
        condition: { field_label: 'Status Kehadiran', operator: 'equals', value: 'Hadir di Lokasi' },
      },
      {
        label: 'Pilihan Konsumsi / Pantangan Makanan',
        type: 'text',
        required: false,
        condition: { field_label: 'Status Kehadiran', operator: 'equals', value: 'Hadir di Lokasi' },
      },
      {
        label: 'Riwayat Penyakit Khusus (Jika Ada)',
        type: 'text',
        required: false,
        condition: { field_label: 'Status Kehadiran', operator: 'equals', value: 'Hadir di Lokasi' },
      },
    ],
    feedback: [
      { label: 'Rating Keseruan Acara & Ice Breaking', type: 'rating', required: true },
      { label: 'Rating Kenyamanan Lokasi & Konsumsi', type: 'rating', required: true },
      { label: 'Skala Kepuasan Kinerja Panitia', type: 'scale', required: true },
      { label: 'Kritik & Masukan untuk Panitia', type: 'textarea', required: false },
    ],
  },
  aspirasi: {
    name: 'Kotak Aspirasi & Survey Angkatan',
    icon: '🗳️',
    is_qr_enabled: false,
    is_feedback_enabled: false,
    form: [
      {
        label: 'Topik Aspirasi / Masukan',
        type: 'select',
        options: ['Akademik & Perkuliahan', 'Fasilitas & Ruang Belajar', 'Kegiatan & Program Kerja Angkatan', 'Transparansi Kas Angkatan', 'Lainnya'],
        required: true,
      },
      {
        label: 'Tingkat Kepuasan Terhadap Perkuliahan Semester Ini',
        type: 'scale',
        required: true,
      },
      {
        label: 'Aspirasi, Saran, atau Keluhan Kamu',
        type: 'textarea',
        required: true,
      },
      {
        label: 'Lampiran / Bukti Pendukung (Jika Ada)',
        type: 'file',
        required: false,
      },
    ],
    feedback: [],
  },
  rapat: {
    name: 'Rapat Divisi & Evaluasi Kerja',
    icon: '💼',
    is_qr_enabled: false,
    is_feedback_enabled: true,
    form: [
      {
        label: 'Divisi / Seksi',
        type: 'select',
        options: ['BPH (Ketua/Wakil/Sekretaris/Bendahara)', 'Divisi Acara', 'Divisi Humas & Publikasi', 'Divisi Perlengkapan', 'Divisi Konsumsi', 'Divisi Danus'],
        required: true,
      },
      {
        label: 'Status Kehadiran Rapat',
        type: 'radio',
        options: ['Hadir On-Time', 'Izin Terlambat', 'Izin Tidak Hadir'],
        required: true,
      },
      {
        label: 'Catatan Progres Kerja / Kendala Divisi',
        type: 'textarea',
        required: false,
      },
    ],
    feedback: [
      { label: 'Rating Efektivitas Jalannya Rapat', type: 'rating', required: true },
      { label: 'Skala Ketepatan Waktu Rapat', type: 'scale', required: true },
      { label: 'Catatan & Saran Evaluasi untuk Rapat Berikutnya', type: 'textarea', required: false },
    ],
  },
  seminar: {
    name: 'Seminar / Workshop Teknologi',
    icon: '🎓',
    is_qr_enabled: true,
    is_feedback_enabled: true,
    form: [
      {
        label: 'Peminatan / Minat Bidang IT',
        type: 'select',
        options: ['Software Engineering & Web Dev', 'Artificial Intelligence & Data Science', 'Cyber Security & Network', 'UI/UX & Product Design'],
        required: true,
      },
      {
        label: 'Pertanyaan Awal untuk Pemateri (Opsional)',
        type: 'textarea',
        required: false,
      },
    ],
    feedback: [
      { label: 'Rating Kualitas Materi & Pemateri', type: 'rating', required: true },
      { label: 'Rating Pembawaan Acara & MC', type: 'rating', required: true },
      { label: 'Skala Manfaat Materi untuk Perkuliahan', type: 'scale', required: true },
      { label: 'Topik Seminar yang Diinginkan Selanjutnya', type: 'textarea', required: false },
    ],
  },
};

function NewEventContent() {
  const supabase = createClient();
  const router   = useRouter();
  const searchParams = useSearchParams();
  const copyFromId   = searchParams.get('copy_from');

  const [namaEvent,          setNamaEvent]          = useState('');
  const [deskripsi,          setDeskripsi]          = useState('');
  const [status,             setStatus]             = useState(true);
  const [isQrEnabled,        setIsQrEnabled]        = useState(false); // Default false: pure form portal
  const [isFeedbackEnabled,  setIsFeedbackEnabled]  = useState(false); // Default false: pure form portal
  const [fields,             setFields]             = useState<FormField[]>([]);
  const [feedbackFields,     setFeedbackFields]     = useState<FormField[]>([
    { label: 'Rating Keseluruhan Acara', type: 'rating', required: true },
    { label: 'Kritik, Saran & Masukan untuk Panitia', type: 'textarea', required: false },
  ]);
  const [activeTab,          setActiveTab]          = useState<BuilderTab>('form');
  const [allEvents,          setAllEvents]          = useState<Event[]>([]);
  const [selectedCopyId,     setSelectedCopyId]     = useState<string>('');
  const [copyNotice,         setCopyNotice]         = useState<string>('');
  const [saving,             setSaving]             = useState(false);
  const [error,              setError]              = useState('');
  const [migrationNeeded,    setMigrationNeeded]    = useState(false);
  const [copiedSql,          setCopiedSql]          = useState(false);

  const SQL_MIGRATION = `-- Buka Supabase Dashboard -> Project vomaluikqvcryocefoke -> SQL Editor:
ALTER TABLE public."event" 
  ADD COLUMN IF NOT EXISTS is_qr_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_feedback_enabled BOOLEAN DEFAULT true;

UPDATE public."event" SET is_qr_enabled = true WHERE is_qr_enabled IS NULL;
UPDATE public."event" SET is_feedback_enabled = true WHERE is_feedback_enabled IS NULL;`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SQL_MIGRATION);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // ── Load available events for copying ──
  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabase.from('event').select('*').order('created_at', { ascending: false });
      if (data) setAllEvents(data as Event[]);
    }
    loadEvents();
  }, [supabase]);

  // ── Pre-fill if copy_from param is present in URL ──
  useEffect(() => {
    if (!copyFromId) return;

    async function loadSourceEvent() {
      const { data } = await supabase.from('event').select('*').eq('id', copyFromId).single();
      if (!data) return;

      if (data.form_schema && Array.isArray(data.form_schema)) {
        setFields(JSON.parse(JSON.stringify(data.form_schema)));
      }
      if (data.feedback_schema && Array.isArray(data.feedback_schema)) {
        setFeedbackFields(JSON.parse(JSON.stringify(data.feedback_schema)));
      }
      const sourceConfig = parseEventConfig(data);
      setIsQrEnabled(sourceConfig.is_qr_enabled);
      setIsFeedbackEnabled(sourceConfig.is_feedback_enabled);
      setNamaEvent(`Salinan - ${data.nama_event}`);
      setDeskripsi(cleanEventDeskripsi(data.deskripsi));
      setCopyNotice(`✓ Berhasil memuat struktur form & feedback dari "${data.nama_event}"!`);
      setTimeout(() => setCopyNotice(''), 6000);
    }
    loadSourceEvent();
  }, [copyFromId, supabase]);

  // ── Import template from selected existing event ──
  const applyCopyFromEvent = (mode: 'all' | 'form' | 'feedback') => {
    const source = allEvents.find((e) => e.id === selectedCopyId);
    if (!source) {
      alert('Pilih formulir / event terlebih dahulu.');
      return;
    }

    if (mode === 'all' || mode === 'form') {
      if (source.form_schema && Array.isArray(source.form_schema)) {
        setFields(JSON.parse(JSON.stringify(source.form_schema)));
      }
    }

    if (mode === 'all' || mode === 'feedback') {
      if (source.feedback_schema && Array.isArray(source.feedback_schema)) {
        setFeedbackFields(JSON.parse(JSON.stringify(source.feedback_schema)));
      }
    }

    const sourceConfig = parseEventConfig(source);
    setIsQrEnabled(sourceConfig.is_qr_enabled);
    setIsFeedbackEnabled(sourceConfig.is_feedback_enabled);

    setCopyNotice(`✓ Susunan ${mode === 'all' ? 'Form & Feedback' : mode === 'form' ? 'Pertanyaan Form' : 'Feedback'} berhasil disalin dari "${source.nama_event}"!`);
    setTimeout(() => setCopyNotice(''), 5000);
  };

  // ── Apply Preset Template ──
  const applyPreset = (key: string) => {
    const preset = PRESET_TEMPLATES[key];
    if (!preset) return;

    setFields(JSON.parse(JSON.stringify(preset.form)));
    setFeedbackFields(JSON.parse(JSON.stringify(preset.feedback)));
    if (preset.is_qr_enabled !== undefined) setIsQrEnabled(preset.is_qr_enabled);
    if (preset.is_feedback_enabled !== undefined) setIsFeedbackEnabled(preset.is_feedback_enabled);
    setCopyNotice(`✓ Template Preset "${preset.name}" berhasil diterapkan!`);
    setTimeout(() => setCopyNotice(''), 5000);
  };

  // ── Save Event ──
  const handleSave = async () => {
    if (!namaEvent.trim()) { setError('Nama event wajib diisi.'); return; }
    setSaving(true); setError(''); setMigrationNeeded(false);

    const payload: any = {
      nama_event:          namaEvent.trim(),
      deskripsi:           cleanEventDeskripsi(deskripsi).trim(),
      status,
      is_qr_enabled:       isQrEnabled,
      is_feedback_enabled: isFeedbackEnabled,
      form_schema:         fields,
      feedback_schema:     feedbackFields,
    };

    let { error: err } = await supabase.from('event').insert(payload);

    if (err && (err.message?.includes('is_qr_enabled') || err.message?.includes('is_feedback_enabled') || err.message?.includes('schema cache'))) {
      setMigrationNeeded(true);
      setError('Kolom toggle "is_qr_enabled" & "is_feedback_enabled" belum dibuat di tabel Supabase. Jalankan query migrasi di bawah pada SQL Editor Supabase agar pembuatan event dengan toggle tersimpan.');
      setSaving(false);
      return;
    }

    if (err) {
      setError(err.message);
      setSaving(false);
    } else {
      router.push('/portal-it-admin/events');
      router.refresh();
    }
  };

  return (
    <main className="min-h-[100dvh] animated-bg text-white">
      <div className="fixed w-96 h-96 rounded-full bg-blue-600/15 -top-24 -left-24 blur-3xl pointer-events-none z-0" />
      <div className="fixed w-72 h-72 rounded-full bg-amber-500/10 bottom-0 right-0 translate-x-1/4 translate-y-1/4 blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6 slide-up">
          <Link href="/portal-it-admin/events" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} weight="bold" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Buat Formulir / Kegiatan Baru</h1>
            <p className="text-slate-400 text-sm">Pilih template pendataan, survey angkatan, registrasi lomba, atau acara dengan tiket QR</p>
          </div>
        </div>

        {/* ── QUICK TEMPLATE IMPORTER / COPY BAR ── */}
        <div className="tech-card rounded-2xl p-5 border border-blue-500/30 shadow-xl mb-6 slide-up space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
              <Lightning size={14} weight="fill" className="text-[#ffc878]" /> Fitur Cepat: Salin / Gunakan Template Form
            </h3>
            <span className="text-[10px] text-slate-400">Efisien &amp; Siap Pakai</span>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">Pilih Preset Template Serbaguna:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.entries(PRESET_TEMPLATES).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-blue-600/20 border border-slate-700 hover:border-blue-500/40 text-left transition-all text-xs flex items-center gap-2"
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-slate-200 font-semibold truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Copy from past events dropdown */}
          {allEvents.length > 0 && (
            <div className="pt-3 border-t border-slate-700/40 space-y-2">
              <label className="block text-[11px] text-slate-400 font-medium">Atau Salin Struktur dari Formulir Sebelumnya:</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedCopyId}
                  onChange={(e) => setSelectedCopyId(e.target.value)}
                  className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">— Pilih Formulir Sumber yang Ingin Disalin —</option>
                  {allEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nama_event} ({ev.form_schema?.length || 0} field form, {ev.feedback_schema?.length || 0} feedback)
                    </option>
                  ))}
                </select>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={!selectedCopyId}
                    onClick={() => applyCopyFromEvent('all')}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl btn-primary text-xs font-bold disabled:opacity-40 transition-all shadow"
                  >
                    <ClipboardText size={13} weight="bold" /> Salin Semua
                  </button>
                  <button
                    type="button"
                    disabled={!selectedCopyId}
                    onClick={() => applyCopyFromEvent('form')}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium disabled:opacity-40 transition-all border border-slate-700"
                    title="Hanya salin pertanyaan formulir"
                  >
                    Hanya Form
                  </button>
                  <button
                    type="button"
                    disabled={!selectedCopyId}
                    onClick={() => applyCopyFromEvent('feedback')}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium disabled:opacity-40 transition-all border border-slate-700"
                    title="Hanya salin pertanyaan feedback"
                  >
                    Hanya Feedback
                  </button>
                </div>
              </div>
            </div>
          )}

          {copyNotice && (
            <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-medium fade-in">
              {copyNotice}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Info event */}
          <div className="tech-card rounded-2xl p-6 slide-up space-y-5 border border-slate-700/60">
            <h2 className="font-semibold text-slate-200 flex items-center gap-2">
              <ListBullets size={16} weight="bold" className="text-slate-400" /> Informasi Formulir / Kegiatan
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nama Formulir / Kegiatan <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={namaEvent}
                onChange={(e) => setNamaEvent(e.target.value)}
                placeholder="cth: Pendataan Lomba DinamIT 2026 atau Makrab Angkatan"
                className="input-glow w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Petunjuk / Broadcast Informasi
              </label>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Informasi dan instruksi yang tampil kepada mahasiswa sebelum mengisi formulir..."
                rows={4}
                className="input-glow w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all resize-none focus:border-blue-500"
              />
            </div>

            {/* Toggle Status & Fitur Event */}
            <div className="space-y-3 pt-2 border-t border-slate-700/60">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Aksesibilitas &amp; Tipe Formulir</p>

              {/* Status Event */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <div>
                  <p className="text-sm font-medium text-slate-200">Status Akses Formulir</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {status ? 'Buka — Mahasiswa dapat mengakses dan mengirim jawaban formulir' : 'Tutup — Formulir dikunci, mahasiswa tidak bisa mengirim respon'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus(!status)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 shrink-0 ${status ? 'bg-green-500' : 'bg-slate-600'}`}
                  title={status ? 'Klik untuk tutup' : 'Klik untuk buka'}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${status ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Toggle QR Code */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <DeviceMobile size={16} weight="bold" className={isQrEnabled ? 'text-cyan-400' : 'text-slate-500'} />
                    <p className="text-sm font-medium text-slate-200">Tiket QR Acara Lapangan</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isQrEnabled ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                      {isQrEnabled ? 'Aktif (Acara Lapangan)' : 'Nonaktif (Form Murni)'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    {isQrEnabled
                      ? 'Aktif — Tab Tiket QR muncul untuk peserta (gunakan untuk acara fisik/lapangan yang butuh scan tiket).'
                      : 'Nonaktif — Form murni tanpa tiket QR (cocok untuk pendataan lomba, kuesioner, aspirasi, pendaftaran tim).'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQrEnabled(!isQrEnabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 shrink-0 ${isQrEnabled ? 'bg-cyan-500' : 'bg-slate-600'}`}
                  title={isQrEnabled ? 'Klik untuk nonaktifkan QR' : 'Klik untuk aktifkan QR'}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${isQrEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Toggle Feedback Acara */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <Star size={16} weight={isFeedbackEnabled ? 'fill' : 'regular'} className={isFeedbackEnabled ? 'text-amber-400' : 'text-slate-500'} />
                    <p className="text-sm font-medium text-slate-200">Kuesioner Feedback / Evaluasi</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isFeedbackEnabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                      {isFeedbackEnabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    {isFeedbackEnabled
                      ? 'Aktif — Peserta dapat mengisi penilaian bintang & saran evaluasi.'
                      : 'Nonaktif — Tab Feedback dinonaktifkan (cukup formulir utama).'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFeedbackEnabled(!isFeedbackEnabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 shrink-0 ${isFeedbackEnabled ? 'bg-amber-500' : 'bg-slate-600'}`}
                  title={isFeedbackEnabled ? 'Klik untuk nonaktifkan feedback' : 'Klik untuk aktifkan feedback'}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${isFeedbackEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Builder Tab Navigation */}
          <div className="flex p-1.5 bg-slate-900/90 rounded-2xl border border-slate-700/70 slide-up">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'form'
                  ? 'bg-blue-600 text-white shadow-lg glow-blue'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <NotePencil size={15} weight="bold" /> Pertanyaan Formulir
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 border border-white/10">
                {fields.length} field
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'feedback'
                  ? 'bg-blue-600 text-white shadow-lg glow-blue'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star size={15} weight={activeTab === 'feedback' ? 'fill' : 'regular'} /> Kuesioner Feedback
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 border border-white/10">
                {feedbackFields.length} field
              </span>
            </button>
          </div>

          {/* Tab 1: Form Builder */}
          {activeTab === 'form' && (
            <div className="tech-card rounded-2xl p-6 slide-up space-y-4 border border-slate-700/60">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                  <NotePencil size={16} weight="bold" className="text-blue-300" /> Form Builder — Susun Pertanyaan
                </h2>
                <span className="text-xs text-slate-400">{fields.length} pertanyaan</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Susun pertanyaan atau input yang harus dijawab oleh mahasiswa.
              </p>
              <FormBuilder fields={fields} setFields={setFields} isAdmin />
            </div>
          )}

          {/* Tab 2: Feedback Builder */}
          {activeTab === 'feedback' && (
            <div className="tech-card rounded-2xl p-6 slide-up space-y-4 border border-slate-700/60">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                  <Star size={16} weight="fill" className="text-[#ffc878]" /> Form Builder — Feedback &amp; Evaluasi
                </h2>
                <span className="text-xs text-slate-400">{feedbackFields.length} pertanyaan</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Kuesioner evaluasi yang akan diisi oleh peserta jika fitur feedback diaktifkan.
              </p>
              <FormBuilder fields={feedbackFields} setFields={setFeedbackFields} isAdmin />
            </div>
          )}

          {migrationNeeded && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 text-sm space-y-3 slide-up">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Warning size={20} weight="bold" />
                Database Migration Diperlukan
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Jalankan script SQL migrasi berikut di <strong>Supabase Dashboard &rarr; SQL Editor</strong> untuk mendukung penyimpanan toggle:
              </p>
              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 font-mono text-xs text-amber-200 overflow-x-auto whitespace-pre">
                  {SQL_MIGRATION}
                </pre>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow"
                >
                  {copiedSql ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                  <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm fade-in">{error}</div>
          )}

          <div className="flex gap-3 slide-up">
            <Link
              href="/portal-it-admin/events"
              className="flex-1 py-3.5 rounded-xl border border-slate-600/50 text-slate-300 hover:text-white text-sm font-semibold transition-all text-center flex items-center justify-center"
            >
              Batal
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3.5 rounded-xl btn-primary text-sm uppercase tracking-wider font-bold transition-all glow-blue disabled:opacity-60"
            >
              {saving
                ? 'Menyimpan...'
                : <><span>Simpan &amp; Publikasikan</span><ArrowRight size={15} weight="bold" /></>
              }
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] animated-bg flex items-center justify-center text-slate-400">Memuat formulir...</div>}>
      <NewEventContent />
    </Suspense>
  );
}
