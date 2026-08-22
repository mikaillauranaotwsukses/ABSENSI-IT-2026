'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FormField } from '@/lib/types';
import FormBuilder from '@/components/FormBuilder';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NewEventPage() {
  const supabase = createClient();
  const router = useRouter();

  const [namaEvent, setNamaEvent] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [status, setStatus] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!namaEvent.trim()) { setError('Nama event wajib diisi.'); return; }
    setSaving(true); setError('');

    const { error: err } = await supabase.from('event').insert({
      nama_event:  namaEvent.trim(),
      deskripsi:   deskripsi.trim(),
      status,
      form_schema: fields,
    });

    if (err) { setError(err.message); setSaving(false); }
    else     { router.push('/portal-it-admin/events'); router.refresh(); }
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
            <p className="text-slate-400 text-sm">Isi detail event dan susun form absensi</p>
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

          {/* Form Builder */}
          <div className="glass-card rounded-2xl p-6 slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                🔧 Form Builder
                <span className="text-xs font-normal text-slate-500 ml-1">— tambahkan field atau blok info/foto</span>
              </h2>
              <span className="text-xs text-slate-500">{fields.length} field</span>
            </div>
            <FormBuilder fields={fields} setFields={setFields} isAdmin />
          </div>

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
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold transition-all glow-indigo disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Menyimpan...' : 'Simpan Event'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
