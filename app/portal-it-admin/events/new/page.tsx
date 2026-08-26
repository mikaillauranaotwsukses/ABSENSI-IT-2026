'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FormField } from '@/lib/types';
import FormBuilder from '@/components/FormBuilder';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type BuilderTab = 'form' | 'feedback';

export default function NewEventPage() {
  const supabase = createClient();
  const router = useRouter();

  const [namaEvent,       setNamaEvent]       = useState('');
  const [deskripsi,       setDeskripsi]       = useState('');
  const [status,          setStatus]          = useState(true);
  const [fields,          setFields]          = useState<FormField[]>([]);
  const [feedbackFields,  setFeedbackFields]  = useState<FormField[]>([
    { label: 'Rating Keseluruhan Acara', type: 'rating', required: true },
    { label: 'Kritik, Saran & Masukan untuk Panitia', type: 'textarea', required: false },
  ]);
  const [activeTab,       setActiveTab]       = useState<BuilderTab>('form');
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

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

    // Fallback if feedback_schema column does not exist in DB yet
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
      <div className="blob w-96 h-96 bg-indigo-700 fixed -top-24 -left-24 pointer-events-none" />
      <div className="blob w-72 h-72 bg-purple-700 fixed bottom-0 right-0 translate-x-1/4 translate-y-1/4 pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8 slide-up">
          <Link href="/portal-it-admin/events" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Buat Event Baru</h1>
            <p className="text-slate-400 text-sm">Isi detail event, susun form absensi, dan atur kuesioner feedback</p>
          </div>
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
