'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Event, Anggota, FormField, Absensi } from '@/lib/types';

interface Props {
  event: Event;
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export default function AbsensiForm({ event }: Props) {
  const supabase = createClient();

  const [nrp,             setNrp]             = useState('');
  const [anggota,         setAnggota]         = useState<Anggota | null>(null);
  const [nrpStatus,       setNrpStatus]       = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
  const [existingAbsensi, setExistingAbsensi] = useState<Absensi | null>(null);
  const [isEditing,       setIsEditing]       = useState(false);

  const [responses,   setResponses]   = useState<Record<string, string>>({});
  const [uploading,   setUploading]   = useState<Record<string, boolean>>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg,    setErrorMsg]    = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── NRP auto-fill + Existing Absensi lookup ─────────────────
  const lookupNrp = useCallback(
    async (value: string) => {
      if (value.length < 5) {
        setAnggota(null);
        setExistingAbsensi(null);
        setNrpStatus('idle');
        setResponses({});
        setIsEditing(false);
        return;
      }
      setNrpStatus('loading');

      // 1. Lookup Anggota by NRP
      const { data: dataAnggota } = await supabase
        .from('anggota')
        .select('*')
        .eq('nrp', value)
        .maybeSingle();

      if (dataAnggota) {
        setAnggota(dataAnggota);
        setNrpStatus('found');

        // 2. Lookup existing Absensi record for this event and NRP
        const { data: dataAbsensi } = await supabase
          .from('absensi')
          .select('*')
          .eq('event_id', event.id)
          .eq('nrp', value)
          .maybeSingle();

        if (dataAbsensi) {
          setExistingAbsensi(dataAbsensi);
          // Pre-fill responses with existing data
          if (dataAbsensi.data_respons && typeof dataAbsensi.data_respons === 'object') {
            setResponses(dataAbsensi.data_respons as Record<string, string>);
          }
          setIsEditing(false);
        } else {
          setExistingAbsensi(null);
          setResponses({});
          setIsEditing(true);
        }
      } else {
        setAnggota(null);
        setExistingAbsensi(null);
        setNrpStatus('not_found');
        setResponses({});
        setIsEditing(false);
      }
    },
    [event.id, supabase]
  );

  useEffect(() => {
    const t = setTimeout(() => lookupNrp(nrp), 400);
    return () => clearTimeout(t);
  }, [nrp, lookupNrp]);

  // ── Branching / Condition Checker ────────────────────────────
  const isFieldVisible = (field: FormField): boolean => {
    if (!field.condition || !field.condition.field_label?.trim()) return true;

    const targetLabelNorm = field.condition.field_label.trim().toLowerCase();

    // Find response key matching targetLabelNorm (case-insensitive & trimmed)
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

    // 1. Try Supabase Storage first
    try {
      const ext  = file.name.split('.').pop();
      const path = `${event.id}/${anggota?.nrp ?? 'unknown'}_${fieldLabel.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;

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

    // 2. Fallback to Base64 Data URL if bucket missing or upload fails
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

  // ── Submit / Upsert (Replace Data) ───────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anggota) return;

    if (Object.values(uploading).some(Boolean)) return;

    setSubmitState('loading');
    setErrorMsg('');

    // Filter out dynamic fields that are not visible or are info blocks
    const dataRespons: Record<string, string> = {};
    (event.form_schema as FormField[])
      .filter((f) => f.type !== 'info' && isFieldVisible(f))
      .forEach((f) => { dataRespons[f.label] = responses[f.label] || ''; });

    // Upsert record (insert or update on conflict)
    const { error } = await supabase.from('absensi').upsert(
      {
        ...(existingAbsensi ? { id: existingAbsensi.id } : {}),
        event_id: event.id,
        nrp:      anggota.nrp,
        data_respons: dataRespons,
      },
      { onConflict: 'event_id, nrp' }
    );

    if (error) {
      setSubmitState('error');
      setErrorMsg(error.message);
    } else {
      setSubmitState('success');
    }
  };

  // ── Success State ────────────────────────────────────────────
  if (submitState === 'success') {
    return (
      <div className="glass-card rounded-2xl p-10 text-center slide-up">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-4xl mx-auto mb-5">✅</div>
        <h3 className="text-2xl font-bold text-white mb-2">
          {existingAbsensi ? 'Jawaban Absensi Berhasil Diperbarui!' : 'Absensi Berhasil!'}
        </h3>
        <p className="text-slate-400 mb-1">
          Halo, <span className="text-indigo-300 font-semibold">{anggota?.nama}</span>!
        </p>
        <p className="text-slate-500 text-sm">
          {existingAbsensi
            ? 'Data respon absensimu berhasil diperbarui.'
            : `Kehadiranmu di ${event.nama_event} sudah tercatat.`
          }
        </p>
        <a href="/" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          Kembali ke Beranda
        </a>
      </div>
    );
  }

  const allUploadsComplete = !Object.values(uploading).some(Boolean);

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 slide-up space-y-6">
      <h2 className="text-lg font-semibold text-slate-200">Form Absensi</h2>

      {/* ── NRP Input ── */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          NRP <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            id="nrp-input"
            type="text"
            value={nrp}
            onChange={(e) => setNrp(e.target.value)}
            placeholder="Masukkan NRP kamu..."
            required
            maxLength={20}
            className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {nrpStatus === 'loading' && (
              <svg className="animate-spin h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {nrpStatus === 'found' && (
              <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            {nrpStatus === 'not_found' && (
              <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </div>

        {nrpStatus === 'found' && anggota && (
          <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/25 fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
                {anggota.nama.charAt(0)}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{anggota.nama}</p>
                <p className="text-slate-400 text-xs">{anggota.program_studi}</p>
              </div>
            </div>
          </div>
        )}

        {nrpStatus === 'not_found' && nrp.length >= 5 && (
          <p className="mt-2 text-red-400 text-xs fade-in">NRP tidak ditemukan dalam database anggota.</p>
        )}
      </div>

      {/* ── Warning Alert if user ALREADY submitted before ── */}
      {nrpStatus === 'found' && anggota && existingAbsensi && !isEditing && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 slide-up">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">⚠️</span>
            <div>
              <h4 className="text-amber-300 font-semibold text-sm">Sudah Pernah Mengisi Absensi</h4>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                Kamu sudah tercatat mengisi absensi untuk event ini pada{' '}
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
            <a
              href="/"
              className="py-2.5 px-4 rounded-xl border border-slate-600/50 text-slate-400 hover:text-white text-xs font-medium transition-all text-center"
            >
              Kembali ke Beranda
            </a>
          </div>
        </div>
      )}

      {/* ── Dynamic fields (shown after NRP validated and editing is enabled) ── */}
      {nrpStatus === 'found' && anggota && isEditing && (event.form_schema as FormField[]).length > 0 && (
        <div className="space-y-5 fade-in">
          <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

          {existingAbsensi && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs flex items-center gap-2">
              <span>✏️</span>
              <span>Kamu sedang memperbarui respon absensi sebelumnya. Silakan sesuaikan isianmu.</span>
            </div>
          )}

          {(event.form_schema as FormField[])
            .filter((field) => isFieldVisible(field))
            .map((field, idx) => {
              // ── INFO BLOCK ──────────────────────────────────
              if (field.type === 'info') {
                return (
                  <div key={idx} className="p-4 rounded-xl bg-amber-600/5 border border-amber-500/20 slide-up">
                    {field.label && (
                      <p className="text-amber-300 font-semibold text-sm mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        {field.label}
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

              // ── FILE UPLOAD ─────────────────────────────────
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
                        <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
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
                          <>
                            <svg className="animate-spin h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-indigo-400 text-sm">Mengupload...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            <div className="text-center">
                              <span className="text-slate-300 text-sm font-medium">Klik untuk upload file</span>
                              <p className="text-slate-500 text-xs mt-0.5">Foto, video, atau PDF — maks. 20MB</p>
                            </div>
                          </>
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

              // ── TEXT / NUMBER / TEXTAREA / SELECT / RADIO ───
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

      {/* Error */}
      {submitState === 'error' && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm fade-in">
          {errorMsg || 'Terjadi kesalahan. Silakan coba lagi.'}
        </div>
      )}

      {/* Submit */}
      {nrpStatus === 'found' && anggota && isEditing && (
        <button
          type="submit"
          disabled={submitState === 'loading' || !allUploadsComplete}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all glow-indigo disabled:opacity-60 disabled:cursor-not-allowed fade-in"
        >
          {submitState === 'loading' || !allUploadsComplete ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {!allUploadsComplete ? 'Menunggu upload...' : 'Menyimpan...'}
            </span>
          ) : (
            existingAbsensi ? 'Perbarui Respon Saya' : 'Konfirmasi Kehadiran'
          )}
        </button>
      )}
    </form>
  );
}
