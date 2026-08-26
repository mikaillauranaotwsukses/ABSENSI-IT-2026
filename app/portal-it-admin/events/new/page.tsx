'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormField, Event } from '@/lib/types';
import FormBuilder from '@/components/FormBuilder';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type BuilderTab = 'form' | 'feedback';

// ── PRESET TEMPLATES ──────────────────────────────────────────
const PRESET_TEMPLATES: Record<string, { name: string; icon: string; form: FormField[]; feedback: FormField[] }> = {
  gathering: {
    name: 'Gathering / Acara Bonding',
    icon: '🎉',
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
      { label: 'Rating Keseruan Games & Ice Breaking', type: 'rating', required: true },
      { label: 'Rating Kenyamanan Lokasi & Konsumsi', type: 'rating', required: true },
      { label: 'Skala Kepuasan Kinerja Panitia', type: 'scale', required: true },
      { label: 'Kritik & Masukan untuk Panitia', type: 'textarea', required: false },
    ],
  },
  rapat: {
    name: 'Rapat Rutin / Evaluasi Divisi',
    icon: '💼',
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

  const [namaEvent,       setNamaEvent]       = useState('');
  const [deskripsi,       setDeskripsi]       = useState('');
  const [status,          setStatus]          = useState(true);
  const [fields,          setFields]          = useState<FormField[]>([]);
  const [feedbackFields,  setFeedbackFields]  = useState<FormField[]>([
    { label: 'Rating Keseluruhan Acara', type: 'rating', required: true },
    { label: 'Kritik, Saran & Masukan untuk Panitia', type: 'textarea', required: false },
  ]);
  const [activeTab,       setActiveTab]       = useState<BuilderTab>('form');
  const [allEvents,       setAllEvents]       = useState<Event[]>([]);
  const [selectedCopyId,  setSelectedCopyId]  = useState<string>('');
  const [copyNotice,      setCopyNotice]      = useState<string>('');
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  // 1. Fetch all past events for copy dropdown
  useEffect(() => {
    async function loadPastEvents() {
      const { data } = await supabase.from('event').select('*').order('created_at', { ascending: false });
      if (data) setAllEvents(data as Event[]);
    }
    loadPastEvents();
  }, [supabase]);

  // 2. Auto-duplicate if copy_from param is present in URL
  useEffect(() => {
    if (!copyFromId) return;

    async function loadSourceEvent() {
      const { data } = await supabase.from('event').select('*').eq('id', copyFromId).maybeSingle();
      if (data) {
        setNamaEvent(`[Salinan] ${data.nama_event}`);
        setDeskripsi(data.deskripsi || '');
        if (data.form_schema && Array.isArray(data.form_schema)) {
          setFields(data.form_schema);
        }
        if (data.feedback_schema && Array.isArray(data.feedback_schema)) {
          setFeedbackFields(data.feedback_schema);
        }
        setSelectedCopyId(data.id);
        setCopyNotice(`✓ Berhasil menyalin susunan form & feedback dari "${data.nama_event}"!`);
      }
    }
    loadSourceEvent();
  }, [copyFromId, supabase]);

  // ── Import template from selected existing event ──
  const applyCopyFromEvent = (mode: 'all' | 'form' | 'feedback') => {
    const source = allEvents.find((e) => e.id === selectedCopyId);
    if (!source) {
      alert('Pilih event terlebih dahulu.');
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

    setCopyNotice(`✓ Susunan ${mode === 'all' ? 'Form & Feedback' : mode === 'form' ? 'Form Absensi' : 'Feedback'} berhasil disalin dari "${source.nama_event}"!`);
    setTimeout(() => setCopyNotice(''), 5000);
  };

  // ── Apply Preset Template ──
  const applyPreset = (key: string) => {
    const preset = PRESET_TEMPLATES[key];
    if (!preset) return;

    setFields(JSON.parse(JSON.stringify(preset.form)));
    setFeedbackFields(JSON.parse(JSON.stringify(preset.feedback)));
    setCopyNotice(`✓ Template Preset "${preset.name}" berhasil diterapkan!`);
    setTimeout(() => setCopyNotice(''), 5000);
  };

  // ── Save Event ──
  const handleSave = async () => {
    if (!namaEvent.trim()) { setError('Nama event wajib diisi.'); return; }
    setSaving(true); setError('');

    const payload: any = {
      nama_event:      namaEvent.trim(),
      deskripsi:       deskripsi.trim(),
      status,
      form_schema:     fields,
      feedback_schema: feedbackFields,
    };

    let { error: err } = await supabase.from('event').insert(payload);

    if (err && (err.message?.includes('feedback_schema') || err.message?.includes('schema cache'))) {
      delete payload.feedback_schema;
      const fallbackRes = await supabase.from('event').insert(payload);
      err = fallbackRes.error;
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
    <main className="min-h-screen animated-bg text-white">
      <div className="fixed w-96 h-96 rounded-full bg-indigo-700/20 -top-24 -left-24 blur-3xl pointer-events-none z-0" />
      <div className="fixed w-72 h-72 rounded-full bg-purple-700/20 bottom-0 right-0 translate-x-1/4 translate-y-1/4 blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6 slide-up">
          <Link href="/portal-it-admin/events" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Buat Event Baru</h1>
            <p className="text-slate-400 text-sm">Isi detail event, susun form absensi, atau salin template dari event sebelumnya</p>
          </div>
        </div>

        {/* ── QUICK TEMPLATE IMPORTER / COPY BAR ── */}
        <div className="glass-card rounded-2xl p-5 border border-indigo-500/30 shadow-xl mb-6 slide-up space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <span>⚡</span> Fitur Cepat: Salin / Gunakan Template Form
            </h3>
            <span className="text-[10px] text-slate-400">Efisien & Tanpa Ketik Ulang</span>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">Gunakan Template Preset Instan:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.entries(PRESET_TEMPLATES).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/50 text-left transition-all text-xs flex items-center gap-2"
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
              <label className="block text-[11px] text-slate-400 font-medium">Atau Salin Form & Feedback dari Event Sebelumnya:</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedCopyId}
                  onChange={(e) => setSelectedCopyId(e.target.value)}
                  className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">— Pilih Event Sumber yang Ingin Disalin —</option>
                  {allEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nama_event} ({ev.form_schema?.length || 0} form, {ev.feedback_schema?.length || 0} feedback)
                    </option>
                  ))}
                </select>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={!selectedCopyId}
                    onClick={() => applyCopyFromEvent('all')}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-40 transition-all shadow"
                  >
                    📋 Salin Semua
                  </button>
                  <button
                    type="button"
                    disabled={!selectedCopyId}
                    onClick={() => applyCopyFromEvent('form')}
                    className="px-2.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium disabled:opacity-40 transition-all"
                    title="Hanya salin pertanyaan form absensi"
                  >
                    Hanya Form
                  </button>
                  <button
                    type="button"
                    disabled={!selectedCopyId}
                    onClick={() => applyCopyFromEvent('feedback')}
                    className="px-2.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium disabled:opacity-40 transition-all"
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
          <div className="glass-card rounded-2xl p-6 slide-up space-y-5">
            <h2 className="font-semibold text-slate-200 flex items-center gap-2">📋 Informasi Event</h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nama Event <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={namaEvent}
                onChange={(e) => setNamaEvent(e.target.value)}
                placeholder="cth: Rapat Perdana IT 26"
                className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Broadcast / Deskripsi
              </label>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Informasi penting yang tampil di halaman absensi..."
                rows={4}
                className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40">
              <div>
                <p className="text-sm font-medium text-slate-200">Status Event</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {status ? 'Buka — anggota dapat absen' : 'Tutup — form tidak aktif'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatus(!status)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${status ? 'bg-green-500' : 'bg-slate-600'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${status ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Builder Tab Navigation */}
          <div className="flex p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/50 slide-up">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'form'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg glow-indigo'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📝</span> Form Absensi / Pendaftaran
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 border border-white/10">
                {fields.length} field
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'feedback'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg glow-indigo'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>⭐</span> Form Feedback / Evaluasi
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 border border-white/10">
                {feedbackFields.length} field
              </span>
            </button>
          </div>

          {/* Tab 1: Form Absensi Builder */}
          {activeTab === 'form' && (
            <div className="glass-card rounded-2xl p-6 slide-up space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                  📝 Form Builder — Absensi & Registrasi
                </h2>
                <span className="text-xs text-slate-400">{fields.length} pertanyaan</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Pertanyaan yang harus diisi anggota pada saat melakukan absensi awal.
              </p>
              <FormBuilder fields={fields} setFields={setFields} isAdmin />
            </div>
          )}

          {/* Tab 2: Feedback Builder */}
          {activeTab === 'feedback' && (
            <div className="glass-card rounded-2xl p-6 slide-up space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                  ⭐ Form Builder — Feedback & Evaluasi Acara
                </h2>
                <span className="text-xs text-slate-400">{feedbackFields.length} pertanyaan</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Kuesioner evaluasi yang akan diisi oleh peserta pada tab ke-3 di halaman event.
              </p>
              <FormBuilder fields={feedbackFields} setFields={setFeedbackFields} isAdmin />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm fade-in">{error}</div>
          )}

          <div className="flex gap-3 slide-up">
            <Link
              href="/portal-it-admin/events"
              className="flex-1 py-3 rounded-xl border border-slate-600/50 text-slate-300 hover:text-white text-sm font-medium transition-all text-center"
            >
              Batal
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold transition-all glow-indigo disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Event'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="min-h-screen animated-bg flex items-center justify-center text-slate-400">Memuat formulir...</div>}>
      <NewEventContent />
    </Suspense>
  );
}
