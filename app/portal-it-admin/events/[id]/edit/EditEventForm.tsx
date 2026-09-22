'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Event, FormField } from '@/lib/types';
import FormBuilder from '@/components/FormBuilder';
import {
  Lightning,
  ClipboardText,
  ListBullets,
  NotePencil,
  Star,
  ArrowRight,
  DeviceMobile,
} from '@phosphor-icons/react';
import {
  parseEventConfig,
  cleanEventDeskripsi,
  buildEventDeskripsiWithConfig,
} from '@/lib/eventConfig';
import DeleteEventButton from '../../DeleteEventButton';
import Link from 'next/link';

interface Props { event: Event; }

type BuilderTab = 'form' | 'feedback';

export default function EditEventForm({ event }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const initialConfig = parseEventConfig(event);
  const [namaEvent,          setNamaEvent]          = useState(event.nama_event);
  const [deskripsi,          setDeskripsi]          = useState(cleanEventDeskripsi(event.deskripsi));
  const [status,             setStatus]             = useState(event.status);
  const [isQrEnabled,        setIsQrEnabled]        = useState(initialConfig.is_qr_enabled);
  const [isFeedbackEnabled,  setIsFeedbackEnabled]  = useState(initialConfig.is_feedback_enabled);
  const [fields,             setFields]             = useState<FormField[]>(event.form_schema || []);
  const [feedbackFields,     setFeedbackFields]     = useState<FormField[]>(
    event.feedback_schema && event.feedback_schema.length > 0
      ? event.feedback_schema
      : [
          { label: 'Rating Keseluruhan Acara', type: 'rating', required: true },
          { label: 'Kritik, Saran & Masukan untuk Panitia', type: 'textarea', required: false },
        ]
  );
  const [activeTab,          setActiveTab]          = useState<BuilderTab>('form');
  const [allEvents,          setAllEvents]          = useState<Event[]>([]);
  const [selectedCopyId,     setSelectedCopyId]     = useState<string>('');
  const [copyNotice,         setCopyNotice]         = useState<string>('');
  const [saving,             setSaving]             = useState(false);
  const [error,              setError]              = useState('');

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

    const sourceConfig = parseEventConfig(source);
    setIsQrEnabled(sourceConfig.is_qr_enabled);
    setIsFeedbackEnabled(sourceConfig.is_feedback_enabled);

    setCopyNotice(`✓ Susunan ${mode === 'all' ? 'Form & Feedback' : mode === 'form' ? 'Form Absensi' : 'Feedback'} berhasil disalin dari "${source.nama_event}"!`);
    setTimeout(() => setCopyNotice(''), 5000);
  };

  const handleSave = async () => {
    if (!namaEvent.trim()) { setError('Nama event wajib diisi.'); return; }
    setSaving(true); setError('');

    const finalDeskripsi = buildEventDeskripsiWithConfig(deskripsi.trim(), {
      is_qr_enabled: isQrEnabled,
      is_feedback_enabled: isFeedbackEnabled,
    });

    const payload: any = {
      nama_event:          namaEvent.trim(),
      deskripsi:           finalDeskripsi,
      status,
      is_qr_enabled:       isQrEnabled,
      is_feedback_enabled: isFeedbackEnabled,
      form_schema:         fields,
      feedback_schema:     feedbackFields,
    };

    let { error: err } = await supabase.from('event').update(payload).eq('id', event.id);

    // Fallback if column does not exist in DB yet
    if (err && (err.message?.includes('is_qr_enabled') || err.message?.includes('is_feedback_enabled') || err.message?.includes('schema cache'))) {
      delete payload.is_qr_enabled;
      delete payload.is_feedback_enabled;
      if (err.message?.includes('feedback_schema')) {
        delete payload.feedback_schema;
      }
      // payload.deskripsi still contains finalDeskripsi with the config tag!
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
        <div className="tech-card rounded-2xl p-5 border border-blue-500/30 shadow-xl slide-up space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
              <Lightning size={14} weight="fill" className="text-[#ffc878]" /> Salin Susunan Form / Feedback dari Event Lain
            </h3>
            <span className="text-[10px] text-slate-400">Timpa susunan dengan cepat</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedCopyId}
              onChange={(e) => setSelectedCopyId(e.target.value)}
              className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
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
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl btn-primary text-xs font-bold disabled:opacity-40 transition-all shadow flex items-center gap-1.5"
              >
                <ClipboardText size={13} weight="bold" /> Salin Semua
              </button>
              <button
                type="button"
                disabled={!selectedCopyId}
                onClick={() => applyCopyFromEvent('form')}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium disabled:opacity-40 transition-all border border-slate-700"
                title="Hanya salin pertanyaan form absensi"
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

          {copyNotice && (
            <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-medium fade-in">
              {copyNotice}
            </div>
          )}
        </div>
      )}

      {/* Info event */}
      <div className="tech-card rounded-2xl p-6 space-y-5 border border-slate-700/60">
        <h2 className="font-semibold text-slate-200 flex items-center gap-2">
          <ListBullets size={16} weight="bold" className="text-slate-400" /> Informasi Event
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Nama Event <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={namaEvent}
            onChange={(e) => setNamaEvent(e.target.value)}
            className="input-glow w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm transition-all focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Broadcast / Deskripsi</label>
          <textarea
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={4}
            className="input-glow w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm transition-all resize-none focus:border-blue-500"
          />
        </div>

        {/* Toggle Status & Fitur Event */}
        <div className="space-y-3 pt-2 border-t border-slate-700/60">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Pengaturan Akses &amp; Fitur Event</p>

          {/* Status Event */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div>
              <p className="text-sm font-medium text-slate-200">Status Akses Event</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {status ? 'Buka — Anggota dapat mengakses dan mengisi absensi' : 'Tutup — Event dikunci, anggota tidak bisa mengisi form'}
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
                <p className="text-sm font-medium text-slate-200">Tab &amp; Tiket QR Code</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isQrEnabled ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                  {isQrEnabled ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                {isQrEnabled
                  ? 'Aktif — Tab Tiket QR muncul untuk peserta dan QR dicatat di laporan.'
                  : 'Nonaktif — Tab Tiket QR disembunyikan dari peserta dan dinonaktifkan di tabel laporan.'}
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
                <p className="text-sm font-medium text-slate-200">Tab Feedback &amp; Evaluasi Peserta</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isFeedbackEnabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                  {isFeedbackEnabled ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                {isFeedbackEnabled
                  ? 'Aktif — Peserta dapat mengisi penilaian bintang & saran evaluasi.'
                  : 'Nonaktif — Tab Feedback disembunyikan dari peserta.'}
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
          <NotePencil size={15} weight="bold" /> Form Absensi / Pendaftaran
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
          <Star size={15} weight={activeTab === 'feedback' ? 'fill' : 'regular'} /> Form Feedback / Evaluasi
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 border border-white/10">
            {feedbackFields.length} field
          </span>
        </button>
      </div>

      {/* Tab 1: Form Absensi Builder */}
      {activeTab === 'form' && (
        <div className="tech-card rounded-2xl p-6 slide-up space-y-4 border border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-200 flex items-center gap-2">
              <NotePencil size={16} weight="bold" className="text-blue-300" /> Form Builder — Absensi &amp; Registrasi
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
        <div className="tech-card rounded-2xl p-6 slide-up space-y-4 border border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-200 flex items-center gap-2">
              <Star size={16} weight="fill" className="text-[#ffc878]" /> Form Builder — Feedback &amp; Evaluasi Acara
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
            : <><span>Simpan Perubahan</span><ArrowRight size={15} weight="bold" /></>
          }
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
