'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMemberAuth } from '@/lib/context/MemberAuthContext';
import { Event, FormField, Absensi, Feedback } from '@/lib/types';
import MemberQRCard from '@/components/MemberQRCard';
import Link from 'next/link';

interface Props {
  event: Event;
}

type TabMode = 'form' | 'qr' | 'feedback';
type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export default function AbsensiForm({ event }: Props) {
  const supabase = createClient();
  const { member, loading: authLoading } = useMemberAuth();

  const [tabMode,          setTabMode]          = useState<TabMode>('form');
  const [existingAbsensi,  setExistingAbsensi]  = useState<Absensi | null>(null);
  const [existingFeedback, setExistingFeedback] = useState<Feedback | null>(null);
  const [isEditing,        setIsEditing]        = useState(false);
  const [isEditingFeedback,setIsEditingFeedback]= useState(false);

  // Form Absensi state
  const [responses,   setResponses]   = useState<Record<string, string>>({});
  const [uploading,   setUploading]   = useState<Record<string, boolean>>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg,    setErrorMsg]    = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Feedback state
  const [feedbackResponses,   setFeedbackResponses]   = useState<Record<string, any>>({});
  const [feedbackSubmitState, setFeedbackSubmitState] = useState<SubmitState>('idle');
  const [feedbackErrorMsg,    setFeedbackErrorMsg]    = useState('');
  const [overallRating,       setOverallRating]       = useState<number>(0); // 0 = Kosong (wajib diklik)

  // Dynamic feedback schema (fallback to standard if not configured)
  const feedbackSchema: FormField[] = (event.feedback_schema && event.feedback_schema.length > 0)
    ? event.feedback_schema
    : [
        { label: 'Rating Keseluruhan Acara', type: 'rating', required: true },
        { label: 'Kritik, Saran & Masukan untuk Panitia', type: 'textarea', required: false },
      ];

  // ── Lookup existing Absensi record for logged-in member ──
  const fetchExistingAbsensi = useCallback(async () => {
    if (!member?.nrp) return;

    const { data: dataAbsensi } = await supabase
      .from('absensi')
      .select('*')
      .eq('event_id', event.id)
      .eq('nrp', member.nrp)
      .maybeSingle();

    if (dataAbsensi) {
      setExistingAbsensi(dataAbsensi as Absensi);
      if (dataAbsensi.data_respons && typeof dataAbsensi.data_respons === 'object') {
        setResponses(dataAbsensi.data_respons as Record<string, string>);
      }
      setIsEditing(false);
    } else {
      setExistingAbsensi(null);
      setResponses({});
      setIsEditing(true);
    }
  }, [event.id, member?.nrp, supabase]);

  // ── Lookup existing Feedback record ──
  const fetchExistingFeedback = useCallback(async () => {
    if (!member?.nrp) return;

    try {
      const { data: dataFeedback } = await supabase
        .from('feedback')
        .select('*')
        .eq('event_id', event.id)
        .eq('nrp', member.nrp)
        .maybeSingle();

      if (dataFeedback) {
        setExistingFeedback(dataFeedback as Feedback);
        if (dataFeedback.data_respons && typeof dataFeedback.data_respons === 'object') {
          setFeedbackResponses(dataFeedback.data_respons);
        }
        if (dataFeedback.rating_overall) {
          setOverallRating(Number(dataFeedback.rating_overall));
        }
        setIsEditingFeedback(false);
      } else {
        setExistingFeedback(null);
        setIsEditingFeedback(true);
      }
    } catch (e) {
      console.warn('Feedback table query notice:', e);
    }
  }, [event.id, member?.nrp, supabase]);

  useEffect(() => {
    fetchExistingAbsensi();
    fetchExistingFeedback();
  }, [fetchExistingAbsensi, fetchExistingFeedback]);

  // ── Branching / Condition Checker ────────────────────────────
  const isFieldVisible = (field: FormField): boolean => {
    if (!field.condition || !field.condition.field_label?.trim()) return true;

    const targetLabelNorm = field.condition.field_label.trim().toLowerCase();
    const matchingKey = Object.keys(responses).find(
      (k) => k.trim().toLowerCase() === targetLabelNorm
    );

    const parentVal = (matchingKey ? String(responses[matchingKey]) : '').trim().toLowerCase();
    const condVal   = (field.condition.value || '').trim().toLowerCase();

    if (field.condition.operator === 'equals') {
      return parentVal === condVal;
    } else if (field.condition.operator === 'not_equals') {
      return parentVal !== condVal && parentVal !== '';
    }
    return true;
  };

  // ── File upload helper ───────────────────────────────────────
  const handleFileUpload = async (fieldLabel: string, file: File) => {
    setUploading((prev) => ({ ...prev, [fieldLabel]: true }));

    try {
      const ext  = file.name.split('.').pop();
      const path = `${event.id}/${member?.nrp ?? 'unknown'}_${fieldLabel.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('absensi-files')
        .upload(path, file, { upsert: true });

      if (!error && data?.path) {
        const { data: { publicUrl } } = supabase.storage
          .from('absensi-files')
          .getPublicUrl(data.path);
        setResponses((prev) => ({ ...prev, [fieldLabel]: publicUrl }));
        setUploading((prev) => ({ ...prev, [fieldLabel]: false }));
        return;
      }
    } catch (e) {
      console.warn('Storage upload error, falling back to Base64:', e);
    }

    // Fallback to Base64 Data URL if bucket missing
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target?.result as string;
      if (base64Url) {
        setResponses((prev) => ({ ...prev, [fieldLabel]: base64Url }));
      }
      setUploading((prev) => ({ ...prev, [fieldLabel]: false }));
    };
    reader.onerror = () => {
      alert('Gagal membaca file.');
      setUploading((prev) => ({ ...prev, [fieldLabel]: false }));
    };
    reader.readAsDataURL(file);
  };

  // ── Submit / Upsert Absensi ───────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    if (Object.values(uploading).some(Boolean)) return;

    setSubmitState('loading');
    setErrorMsg('');

    const dataRespons: Record<string, string> = {};
    (event.form_schema as FormField[])
      .filter((f) => f.type !== 'info' && isFieldVisible(f))
      .forEach((f) => { dataRespons[f.label] = responses[f.label] || ''; });

    const payload: any = {
      ...(existingAbsensi ? { id: existingAbsensi.id } : {}),
      event_id:       event.id,
      nrp:            member.nrp,
      data_respons:   dataRespons,
      is_form_filled: true,
    };

    let { error } = await supabase.from('absensi').upsert(payload, { onConflict: 'event_id, nrp' });

    if (error && (error.message?.includes('is_form_filled') || error.message?.includes('schema cache') || error.code === 'PGRST204')) {
      delete payload.is_form_filled;
      const fallbackRes = await supabase.from('absensi').upsert(payload, { onConflict: 'event_id, nrp' });
      error = fallbackRes.error;
    }

    if (error) {
      setSubmitState('error');
      setErrorMsg(error.message);
    } else {
      setSubmitState('success');
      fetchExistingAbsensi();
    }
  };

  // ── Submit Feedback ───────────────────────────────────────────
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setFeedbackSubmitState('loading');
    setFeedbackErrorMsg('');

    // Validasi rating keseluruhan harus dipilih (tidak boleh 0)
    if (!overallRating || overallRating < 1) {
      setFeedbackSubmitState('error');
      setFeedbackErrorMsg('Silakan klik bintang untuk memberikan rating kepuasan acara terlebih dahulu.');
      return;
    }

    // Validasi field feedback dinamis yang required
    for (const field of feedbackSchema) {
      if (field.required) {
        const val = feedbackResponses[field.label];
        if (field.type === 'rating' && (!val || Number(val) < 1)) {
          setFeedbackSubmitState('error');
          setFeedbackErrorMsg(`Silakan klik bintang rating untuk "${field.label}".`);
          return;
        }
        if (field.type === 'scale' && (!val || Number(val) < 1)) {
          setFeedbackSubmitState('error');
          setFeedbackErrorMsg(`Silakan pilih skala untuk "${field.label}".`);
          return;
        }
        if (!val || String(val).trim() === '') {
          setFeedbackSubmitState('error');
          setFeedbackErrorMsg(`Pertanyaan "${field.label}" wajib diisi.`);
          return;
        }
      }
    }

    try {
      const res = await fetch('/api/member/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id:       event.id,
          nrp:            member.nrp,
          data_respons:   feedbackResponses,
          rating_overall: overallRating,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setFeedbackSubmitState('error');
        setFeedbackErrorMsg(data.message || 'Gagal mengirim feedback.');
      } else {
        setFeedbackSubmitState('success');
        fetchExistingFeedback();
      }
    } catch (err: any) {
      setFeedbackSubmitState('error');
      setFeedbackErrorMsg(err?.message || 'Terjadi kesalahan koneksi server.');
    }
  };

  // ── If auth is loading ──
  if (authLoading) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
        <svg className="animate-spin h-8 w-8 mx-auto mb-3 text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p>Memuat sesi anggota...</p>
      </div>
    );
  }

  // ── If user is NOT logged in ──
  if (!member) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center slide-up">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-3xl mx-auto mb-4">🔒</div>
        <h3 className="text-xl font-bold text-white mb-2">Login Diperlukan</h3>
        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
          Silakan login menggunakan NRP dan Password Anda terlebih dahulu untuk mengisi form atau melihat Tiket QR.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all glow-indigo"
        >
          🔑 Login Anggota Sekarang
        </Link>
      </div>
    );
  }

  // ── Success State for Absensi Form ───────────────────────────
  if (submitState === 'success' && tabMode === 'form') {
    return (
      <div className="glass-card rounded-2xl p-10 text-center slide-up space-y-4">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-4xl mx-auto">✅</div>
        <h3 className="text-2xl font-bold text-white">
          {existingAbsensi ? 'Jawaban Absensi Berhasil Diperbarui!' : 'Absensi Berhasil!'}
        </h3>
        <p className="text-slate-400 text-sm">
          Halo, <span className="text-indigo-300 font-semibold">{member.nama}</span>! Keterangan absensimu telah tersimpan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
          <button
            onClick={() => { setSubmitState('idle'); setTabMode('qr'); }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            📱 Tampilkan Tiket QR Saya
          </button>
          <button
            onClick={() => { setSubmitState('idle'); setTabMode('feedback'); }}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            ⭐ Isi Feedback Acara
          </button>
          <a href="/" className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
            Beranda
          </a>
        </div>
      </div>
    );
  }

  const allUploadsComplete = !Object.values(uploading).some(Boolean);

  return (
    <div className="space-y-6">
      {/* ── Logged-in Member Auto-Greeting Card ── */}
      <div className="glass-card rounded-2xl p-5 slide-up flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-lg shrink-0 glow-indigo">
          {member.nama.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-base truncate">{member.nama}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              {member.nrp}
            </span>
          </div>
          <p className="text-slate-400 text-xs truncate">{member.program_studi}</p>
        </div>
      </div>

      {/* ── 3-Tab Selector Bar ── */}
      <div className="grid grid-cols-3 p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/50 slide-up gap-1">
        <button
          type="button"
          onClick={() => setTabMode('form')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tabMode === 'form'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg glow-indigo'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📝</span> <span className="hidden sm:inline">Form</span> Keterangan
        </button>
        <button
          type="button"
          onClick={() => setTabMode('qr')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tabMode === 'qr'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg glow-indigo'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📱</span> Tiket QR <span className="hidden sm:inline">Saya</span>
        </button>
        <button
          type="button"
          onClick={() => setTabMode('feedback')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tabMode === 'feedback'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg glow-indigo'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>⭐</span> Feedback <span className="hidden sm:inline">Acara</span>
        </button>
      </div>

      {/* ── TAB 2: QR CODE TICKET ── */}
      {tabMode === 'qr' && (
        <MemberQRCard event={event} member={member} absensi={existingAbsensi} />
      )}

      {/* ── TAB 1: FORM KETERANGAN ── */}
      {tabMode === 'form' && (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 slide-up space-y-6">
          <h2 className="text-lg font-semibold text-slate-200">Form Keterangan Event</h2>

          {/* Warning Alert if user ALREADY submitted before */}
          {existingAbsensi?.is_form_filled && !isEditing && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 slide-up">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">⚠️</span>
                <div>
                  <h4 className="text-amber-300 font-semibold text-sm">Sudah Pernah Mengisi Form</h4>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                    Kamu sudah mengisi keterangan untuk event ini pada{' '}
                    <span className="text-amber-200 font-medium">
                      {new Date(existingAbsensi.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Perbarui / Edit Respon Saya
                </button>
                <button
                  type="button"
                  onClick={() => setTabMode('qr')}
                  className="py-2.5 px-4 rounded-xl border border-slate-600/50 text-slate-300 hover:text-white text-xs font-medium transition-all text-center"
                >
                  Lihat Tiket QR
                </button>
              </div>
            </div>
          )}

          {/* Dynamic fields */}
          {isEditing && (event.form_schema as FormField[]).length > 0 && (
            <div className="space-y-5 fade-in">
              {existingAbsensi?.is_form_filled && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs flex items-center gap-2">
                  <span>✏️</span>
                  <span>Kamu sedang memperbarui respon absensi sebelumnya. Silakan sesuaikan isianmu.</span>
                </div>
              )}

              {(event.form_schema as FormField[])
                .filter((field) => isFieldVisible(field))
                .map((field, idx) => {
                  if (field.type === 'info') {
                    return (
                      <div key={idx} className="p-4 rounded-xl bg-amber-600/5 border border-amber-500/20 slide-up">
                        {field.label && (
                          <p className="text-amber-300 font-semibold text-sm mb-2 flex items-center gap-2">
                            <span>💡</span> {field.label}
                          </p>
                        )}
                        {field.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={field.image_url}
                            alt={field.label || 'Info'}
                            className="w-full h-auto rounded-lg mb-3 border border-amber-500/20 shadow-sm"
                          />
                        )}
                        {field.content && (
                          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{field.content}</p>
                        )}
                      </div>
                    );
                  }

                  if (field.type === 'file') {
                    const uploaded   = !!responses[field.label];
                    const isUploading = uploading[field.label];
                    return (
                      <div key={idx} className="slide-up">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {uploaded ? (
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/25">
                            <span className="text-green-400 text-lg">✓</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-green-300 text-sm font-medium">File tersimpan</p>
                              <a
                                href={responses[field.label]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors truncate block"
                              >
                                Lihat file →
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setResponses((prev) => { const n = {...prev}; delete n[field.label]; return n; });
                                if (fileRefs.current[field.label]) fileRefs.current[field.label]!.value = '';
                              }}
                              className="text-slate-400 hover:text-red-400 transition-colors text-xs"
                            >
                              Ganti
                            </button>
                          </div>
                        ) : (
                          <label className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                            isUploading
                              ? 'border-indigo-500/50 bg-indigo-600/10'
                              : 'border-slate-600/50 hover:border-indigo-500/50 hover:bg-indigo-600/5'
                          }`}>
                            {isUploading ? (
                              <span className="text-indigo-400 text-sm">Mengupload...</span>
                            ) : (
                              <div className="text-center">
                                <span className="text-slate-300 text-sm font-medium">Klik untuk upload file</span>
                                <p className="text-slate-500 text-xs mt-0.5">Foto, video, atau PDF — maks. 20MB</p>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*,video/*,.pdf,application/pdf"
                              className="hidden"
                              required={field.required && !uploaded}
                              ref={(el) => { fileRefs.current[field.label] = el; }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(field.label, f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="slide-up">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>

                      {(field.type === 'text' || field.type === 'number') && (
                        <input
                          type={field.type}
                          value={responses[field.label] || ''}
                          onChange={(e) => setResponses((prev) => ({ ...prev, [field.label]: e.target.value }))}
                          required={field.required}
                          placeholder={`Isi ${field.label.toLowerCase()}...`}
                          className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all"
                        />
                      )}

                      {field.type === 'textarea' && (
                        <textarea
                          value={responses[field.label] || ''}
                          onChange={(e) => setResponses((prev) => ({ ...prev, [field.label]: e.target.value }))}
                          required={field.required}
                          rows={3}
                          placeholder={`Isi ${field.label.toLowerCase()}...`}
                          className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all resize-none"
                        />
                      )}

                      {field.type === 'select' && field.options && (
                        <select
                          value={responses[field.label] || ''}
                          onChange={(e) => setResponses((prev) => ({ ...prev, [field.label]: e.target.value }))}
                          required={field.required}
                          className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white text-sm transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled className="bg-slate-800">Pilih {field.label.toLowerCase()}...</option>
                          {field.options.map((opt, i) => (
                            <option key={i} value={opt} className="bg-slate-800">{opt}</option>
                          ))}
                        </select>
                      )}

                      {field.type === 'radio' && field.options && (
                        <div className="flex flex-wrap gap-3">
                          {field.options.map((opt, i) => (
                            <label
                              key={i}
                              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-sm ${
                                responses[field.label] === opt
                                  ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                                  : 'border-slate-600/50 bg-slate-800/40 text-slate-400 hover:border-slate-500'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`field-${idx}`}
                                value={opt}
                                checked={responses[field.label] === opt}
                                onChange={() => setResponses((prev) => ({ ...prev, [field.label]: opt }))}
                                required={field.required}
                                className="hidden"
                              />
                              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${responses[field.label] === opt ? 'border-indigo-400' : 'border-slate-500'}`}>
                                {responses[field.label] === opt && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
                              </span>
                              {opt}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {submitState === 'error' && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm fade-in">
              {errorMsg || 'Terjadi kesalahan. Silakan coba lagi.'}
            </div>
          )}

          {isEditing && (
            <button
              type="submit"
              disabled={submitState === 'loading' || !allUploadsComplete}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all glow-indigo disabled:opacity-60 disabled:cursor-not-allowed fade-in"
            >
              {submitState === 'loading' || !allUploadsComplete ? (
                <span>Menyimpan...</span>
              ) : (
                existingAbsensi?.is_form_filled ? 'Perbarui Form Keterangan' : 'Kirim Form Keterangan'
              )}
            </button>
          )}
        </form>
      )}

      {/* ── TAB 3: FORM FEEDBACK & EVALUASI ACARA ── */}
      {tabMode === 'feedback' && (
        <div className="glass-card rounded-2xl p-6 slide-up space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <span>⭐</span> Feedback & Evaluasi Acara
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Berikan penilaian dan masukan Anda untuk peningkatan kualitas acara mendatang.
              </p>
            </div>
          </div>

          {/* Feedback Success View */}
          {feedbackSubmitState === 'success' && (
            <div className="p-6 rounded-2xl bg-green-500/15 border border-green-500/40 text-center slide-up space-y-2">
              <div className="text-4xl">🎉</div>
              <h3 className="text-lg font-bold text-white">Terima Kasih atas Feedback Anda!</h3>
              <p className="text-green-300 text-xs">Masukan Anda telah berhasil dicatat untuk evaluasi panitia.</p>
              <button
                type="button"
                onClick={() => { setFeedbackSubmitState('idle'); setIsEditingFeedback(true); }}
                className="mt-3 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold"
              >
                ✏️ Edit Respon Feedback
              </button>
            </div>
          )}

          {/* Existing Feedback Notice */}
          {existingFeedback && !isEditingFeedback && feedbackSubmitState !== 'success' && (
            <div className="p-5 rounded-2xl bg-purple-500/15 border border-purple-500/30 space-y-3 slide-up">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 font-semibold">
                    ✓ Feedback Sudah Dikirim
                  </span>
                  <div className="flex items-center gap-1.5 mt-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`text-2xl ${star <= (existingFeedback.rating_overall || 5) ? 'text-amber-400' : 'text-slate-600'}`}>
                        ★
                      </span>
                    ))}
                    <span className="text-sm font-bold text-white ml-2">
                      {existingFeedback.rating_overall || 5} / 5
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingFeedback(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow"
                >
                  ✏️ Edit Feedback
                </button>
              </div>

              {/* Show previous answers summary */}
              {existingFeedback.data_respons && Object.keys(existingFeedback.data_respons).length > 0 && (
                <div className="pt-3 border-t border-purple-500/20 space-y-2">
                  {Object.entries(existingFeedback.data_respons).map(([label, ans], i) => (
                    <div key={i} className="text-xs">
                      <span className="text-slate-400">{label}:</span>{' '}
                      <span className="text-white font-medium">{String(ans)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feedback Form Inputs */}
          {isEditingFeedback && feedbackSubmitState !== 'success' && (
            <form onSubmit={handleFeedbackSubmit} className="space-y-5 fade-in">
              {/* Overall Star Rating */}
              <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center space-y-2.5">
                <label className="block text-sm font-semibold text-slate-200">
                  Seberapa puas Anda dengan acara ini secara keseluruhan? <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center justify-center gap-3 py-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isSelected = overallRating > 0 && star <= overallRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setOverallRating(star)}
                        className="p-1 text-3xl sm:text-4xl transition-all hover:scale-125 focus:outline-none"
                        title={`${star} Bintang`}
                      >
                        <span className={isSelected ? 'text-amber-400 drop-shadow-md' : 'text-slate-500 hover:text-amber-300'}>
                          {isSelected ? '★' : '☆'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs">
                  {overallRating === 0 ? (
                    <span className="text-indigo-300/80 italic font-medium">
                      👆 Klik salah satu bintang di atas untuk memberi rating (1 - 5)
                    </span>
                  ) : overallRating === 5 ? (
                    <span className="text-amber-300 font-bold">🌟 Sangat Puas / Luar Biasa! (5/5)</span>
                  ) : overallRating === 4 ? (
                    <span className="text-amber-300 font-bold">👍 Puas / Bagus Sekali (4/5)</span>
                  ) : overallRating === 3 ? (
                    <span className="text-amber-300 font-bold">👌 Cukup / Rata-rata (3/5)</span>
                  ) : overallRating === 2 ? (
                    <span className="text-amber-300 font-bold">👎 Kurang Puas (2/5)</span>
                  ) : (
                    <span className="text-amber-300 font-bold">⚠️ Sangat Kurang (1/5)</span>
                  )}
                </div>
              </div>

              {/* Dynamic feedback custom fields */}
              {feedbackSchema.map((field, idx) => {
                if (field.type === 'rating') {
                  const currentVal = feedbackResponses[field.label] !== undefined ? Number(feedbackResponses[field.label]) : 0;
                  return (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((s) => {
                          const isSel = currentVal > 0 && s <= currentVal;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFeedbackResponses((prev) => ({ ...prev, [field.label]: s }))}
                              className="text-2xl sm:text-3xl transition-transform hover:scale-110 focus:outline-none"
                              title={`${s} Bintang`}
                            >
                              <span className={isSel ? 'text-amber-400 drop-shadow-sm' : 'text-slate-500 hover:text-amber-300'}>
                                {isSel ? '★' : '☆'}
                              </span>
                            </button>
                          );
                        })}
                        <span className="text-xs text-slate-400 ml-2">
                          {currentVal > 0 ? `${currentVal} / 5 Bintang` : <span className="text-slate-500 italic">Belum dipilih</span>}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (field.type === 'scale') {
                  const currentScale = feedbackResponses[field.label] !== undefined ? Number(feedbackResponses[field.label]) : null;
                  return (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-300">
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </label>
                        <span className="text-xs text-indigo-300 font-mono">
                          {currentScale !== null ? `Skala: ${currentScale}/10` : <span className="text-slate-500 italic">Belum dipilih</span>}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setFeedbackResponses((prev) => ({ ...prev, [field.label]: num }))}
                            className={`py-2 rounded-xl text-xs font-bold transition-all ${
                              currentScale === num
                                ? 'bg-indigo-600 text-white glow-indigo scale-105 shadow-md'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (field.type === 'textarea') {
                  return (
                    <div key={idx} className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <textarea
                        value={feedbackResponses[field.label] || ''}
                        onChange={(e) => setFeedbackResponses((prev) => ({ ...prev, [field.label]: e.target.value }))}
                        required={field.required}
                        rows={3}
                        placeholder="Tuliskan masukan / kesan & pesan Anda..."
                        className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all resize-none"
                      />
                    </div>
                  );
                }

                return (
                  <div key={idx} className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="text"
                      value={feedbackResponses[field.label] || ''}
                      onChange={(e) => setFeedbackResponses((prev) => ({ ...prev, [field.label]: e.target.value }))}
                      required={field.required}
                      placeholder="Jawaban Anda..."
                      className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all"
                    />
                  </div>
                );
              })}

              {feedbackErrorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm fade-in">
                  {feedbackErrorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={feedbackSubmitState === 'loading'}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all glow-purple disabled:opacity-60"
              >
                {feedbackSubmitState === 'loading' ? 'Mengirim Feedback...' : 'Kirim Feedback Acara'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
