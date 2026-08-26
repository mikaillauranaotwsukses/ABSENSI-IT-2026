'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FormField, Event } from '@/lib/types';
import FormBuilder from '@/components/FormBuilder';
import DeleteEventButton from '../../DeleteEventButton';
import Link from 'next/link';

interface Props { event: Event; }

type BuilderTab = 'form' | 'feedback';

export default function EditEventForm({ event }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [namaEvent,       setNamaEvent]       = useState(event.nama_event);
  const [deskripsi,       setDeskripsi]       = useState(event.deskripsi || '');
  const [status,          setStatus]          = useState(event.status);
  const [fields,          setFields]          = useState<FormField[]>(event.form_schema || []);
  const [feedbackFields,  setFeedbackFields]  = useState<FormField[]>(
    event.feedback_schema && event.feedback_schema.length > 0
      ? event.feedback_schema
      : [
          { label: 'Rating Keseluruhan Acara', type: 'rating', required: true },
          { label: 'Kritik, Saran & Masukan untuk Panitia', type: 'textarea', required: false },
        ]
  );
  const [activeTab,       setActiveTab]       = useState<BuilderTab>('form');
  const [allEvents,       setAllEvents]       = useState<Event[]>([]);
  const [selectedCopyId,  setSelectedCopyId]  = useState<string>('');
  const [copyNotice,      setCopyNotice]      = useState<string>('');
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  // Load other events for copy dropdown
  useEffect(() => {
    async function loadOtherEvents() {
      const { data } = await supabase.from('event').select('*').neq('id', event.id).order('created_at', { ascending: false });
      if (data) setAllEvents(data as Event[]);
    }
    loadOtherEvents();
  }, [event.id, supabase]);

  // Import template from selected existing event
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

    let { error: err } = await supabase.from('event').update(payload).eq('id', event.id);

    // Fallback if feedback_schema column does not exist in DB yet
    if (err && (err.message?.includes('feedback_schema') || err.message?.includes('schema cache'))) {
      delete payload.feedback_schema;
      const fallbackRes = await supabase.from('event').update(payload).eq('id', event.id);
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
    <div className="space-y-6">
      {/* ── QUICK TEMPLATE IMPORTER / COPY BAR ── */}
      {allEvents.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-indigo-500/30 shadow-xl slide-up space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <span>⚡</span> Salin Susunan Form / Feedback dari Event Lain
            </h3>
            <span className="text-[10px] text-slate-400">Timpa susunan dengan cepat</span>
          </div>

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

          {copyNotice && (
            <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-medium fade-in">
              {copyNotice}
            </div>
          )}
        </div>
      )}

      {/* Info event */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-slate-200">📋 Informasi Event</h2>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Nama Event <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={namaEvent}
            onChange={(e) => setNamaEvent(e.target.value)}
            className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white text-sm transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Broadcast / Deskripsi</label>
          <textarea
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={4}
            className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white text-sm transition-all resize-none"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40">
          <div>
            <p className="text-sm font-medium text-slate-200">Status Event</p>
            <p className="text-slate-500 text-xs mt-0.5">{status ? 'Buka' : 'Tutup'}</p>
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

      <div className="flex gap-3">
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
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="glass-card rounded-2xl p-5 border border-red-500/10">
        <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Zona Bahaya
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">Hapus event ini beserta semua data absensinya secara permanen.</p>
          <DeleteEventButton eventId={event.id} eventName={event.nama_event} />
        </div>
      </div>
    </div>
  );
}
