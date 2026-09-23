'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMemberAuth } from '@/lib/context/MemberAuthContext';
import { Event, FormField, Absensi, Feedback } from '@/lib/types';
import MemberQRCard from '@/components/MemberQRCard';
import Link from 'next/link';
import {
  LockSimple, NotePencil, DeviceMobile, Star, CheckCircle,
  Warning, PencilSimple, ChatCircle, Confetti, Lightbulb,
  ArrowRight,
} from '@phosphor-icons/react';
import { AbsensiFormSkeleton } from '@/components/Skeleton';
import { parseEventConfig } from '@/lib/eventConfig';

interface Props {
  event: Event;
}

type TabMode = 'form' | 'qr' | 'feedback';
type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export default function AbsensiForm({ event }: Props) {
  const supabase = createClient();
  const { member, loading: authLoading } = useMemberAuth();
  const eventConfig = parseEventConfig(event);
  const { is_qr_enabled: isQrEnabled, is_feedback_enabled: isFeedbackEnabled, max_responses_per_user: maxResponses } = eventConfig;

  const [tabMode,          setTabMode]          = useState<TabMode>('form');
  const [existingAbsensi,  setExistingAbsensi]  = useState<Absensi | null>(null);
  const [existingFeedback, setExistingFeedback] = useState<Feedback | null>(null);
  const [isEditing,        setIsEditing]        = useState(false);
  const [isEditingFeedback,setIsEditingFeedback]= useState(false);

  // Multiple Submissions State
  interface SubmissionEntry {
    id: string;
    rowId: string;
    submission_no: number;
    created_at: string;
    data_respons: Record<string, string>;
  }
  const [mySubmissions, setMySubmissions] = useState<SubmissionEntry[]>([]);
  const [editingSubmissionIndex, setEditingSubmissionIndex] = useState<number | null>(null);

  // Fallback if current active tab is disabled
  useEffect(() => {
    if (!isQrEnabled && tabMode === 'qr') {
      setTabMode('form');
    }
    if (!isFeedbackEnabled && tabMode === 'feedback') {
      setTabMode('form');
    }
  }, [isQrEnabled, isFeedbackEnabled, tabMode]);

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

  // ── Lookup existing Absensi record(s) for logged-in member ──
  const fetchExistingAbsensi = useCallback(async () => {
    if (!member?.nrp) return;

    const { data: rows } = await supabase
      .from('absensi')
      .select('*')
      .eq('event_id', event.id)
      .eq('nrp', member.nrp)
      .order('created_at', { ascending: true });

    const subs: SubmissionEntry[] = [];
    if (rows && rows.length > 0) {
      rows.forEach((row, rowIdx) => {
        if (row.data_respons?.__submissions && Array.isArray(row.data_respons.__submissions)) {
          row.data_respons.__submissions.forEach((subItem: any, sIdx: number) => {
            subs.push({
              id: `${row.id}_${sIdx}`,
              rowId: row.id,
              submission_no: subItem.submission_no || sIdx + 1,
              created_at: subItem.created_at || row.created_at,
              data_respons: (subItem.data_respons || {}) as Record<string, string>,
            });
          });
        } else if (row.is_form_filled || (row.data_respons && Object.keys(row.data_respons).length > 0)) {
          subs.push({
            id: row.id,
            rowId: row.id,
            submission_no: rowIdx + 1,
            created_at: row.created_at,
            data_respons: (row.data_respons || {}) as Record<string, string>,
          });
        }
      });
    }

    setMySubmissions(subs);

    if (subs.length > 0) {
      setExistingAbsensi(rows![0] as Absensi);
      setResponses(subs[subs.length - 1].data_respons);
      setEditingSubmissionIndex(subs.length - 1);
      setIsEditing(false);
    } else {
      setExistingAbsensi(null);
      setResponses({});
      setEditingSubmissionIndex(null);
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

  // ── Quota Counts for Dropdown / Options ──────────────────────
  const [quotaCounts, setQuotaCounts] = useState<Record<string, Record<string, number>>>({});

  const fetchQuotaCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('absensi')
        .select('nrp, data_respons')
        .eq('event_id', event.id);

      if (error || !data) return;

      const counts: Record<string, Record<string, number>> = {};
      data.forEach((row: any) => {
        if (row.data_respons?.__submissions && Array.isArray(row.data_respons.__submissions)) {
          row.data_respons.__submissions.forEach((subItem: any) => {
            const resp = subItem.data_respons;
            if (resp && typeof resp === 'object') {
              Object.entries(resp).forEach(([fLabel, chosen]) => {
                if (chosen && typeof chosen === 'string') {
                  if (!counts[fLabel]) counts[fLabel] = {};
                  counts[fLabel][chosen] = (counts[fLabel][chosen] || 0) + 1;
                }
              });
            }
          });
        } else {
          const resp = row.data_respons;
          if (resp && typeof resp === 'object') {
            Object.entries(resp).forEach(([fLabel, chosen]) => {
              if (chosen && typeof chosen === 'string') {
                if (!counts[fLabel]) counts[fLabel] = {};
                counts[fLabel][chosen] = (counts[fLabel][chosen] || 0) + 1;
              }
            });
          }
        }
      });
      setQuotaCounts(counts);
    } catch (e) {
      console.warn('Gagal memuat data kuota opsi:', e);
    }
  }, [event.id, supabase]);

  useEffect(() => {
    fetchExistingAbsensi();
    fetchExistingFeedback();
    fetchQuotaCounts();

    // Supabase Realtime channel for live quota updates
    const channel = supabase
      .channel(`event-quota-${event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'absensi', filter: `event_id=eq.${event.id}` },
        () => {
          fetchQuotaCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id, fetchExistingAbsensi, fetchExistingFeedback, fetchQuotaCounts, supabase]);

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

    // Pre-check quotas before saving
    const schemaFields = (event.form_schema as FormField[]) || [];
    const fieldsWithQuota = schemaFields.filter((f) => f.enable_quota && f.option_quotas && isFieldVisible(f));

    if (fieldsWithQuota.length > 0) {
      const { data: latestAbsensi } = await supabase
        .from('absensi')
        .select('nrp, data_respons')
        .eq('event_id', event.id);

      for (const field of fieldsWithQuota) {
        const chosenVal = responses[field.label];
        if (chosenVal && field.option_quotas?.[chosenVal] !== undefined) {
          const quota = field.option_quotas[chosenVal];
          if (quota > 0) {
            const countOtherUsers = (latestAbsensi || []).filter(
              (r: any) => r.nrp !== member.nrp && r.data_respons?.[field.label] === chosenVal
            ).length;

            if (countOtherUsers >= quota) {
              setSubmitState('error');
              setErrorMsg(`Maaf, kuota untuk pilihan "${chosenVal}" pada pertanyaan "${field.label}" sudah penuh (${countOtherUsers}/${quota}). Silakan pilih opsi lain.`);
              fetchQuotaCounts();
              return;
            }
          }
        }
      }
    }

    const dataRespons: Record<string, string> = {};
    (event.form_schema as FormField[])
      .filter((f) => f.type !== 'info' && isFieldVisible(f))
      .forEach((f) => { dataRespons[f.label] = responses[f.label] || ''; });

    let saveError: any = null;

    // A. If user is editing a specific existing submission
    if (editingSubmissionIndex !== null && mySubmissions[editingSubmissionIndex]) {
      const targetSub = mySubmissions[editingSubmissionIndex];
      const { data: parentRow } = await supabase
        .from('absensi')
        .select('*')
        .eq('id', targetSub.rowId)
        .maybeSingle();

      if (parentRow?.data_respons?.__submissions && Array.isArray(parentRow.data_respons.__submissions)) {
        const updatedSubs = [...parentRow.data_respons.__submissions];
        updatedSubs[editingSubmissionIndex] = {
          ...updatedSubs[editingSubmissionIndex],
          data_respons: dataRespons,
          updated_at: new Date().toISOString(),
        };
        const { error: errUpdate } = await supabase.from('absensi').update({
          data_respons: {
            ...parentRow.data_respons,
            ...dataRespons,
            __submissions: updatedSubs,
          },
          is_form_filled: true,
        }).eq('id', targetSub.rowId);
        saveError = errUpdate;
      } else {
        const { error: errUpdate } = await supabase.from('absensi').update({
          data_respons: dataRespons,
          is_form_filled: true,
        }).eq('id', targetSub.rowId);
        saveError = errUpdate;
      }
    } else {
      // B. User is submitting a NEW response!
      if (maxResponses === 1) {
        // Single response mode: upsert
        const payload: any = {
          ...(existingAbsensi ? { id: existingAbsensi.id } : {}),
          event_id:       event.id,
          nrp:            member.nrp,
          data_respons:   dataRespons,
          is_form_filled: true,
        };
        const { error: errUpsert } = await supabase.from('absensi').upsert(payload, { onConflict: 'event_id, nrp' });
        saveError = errUpsert;
      } else {
        // Multi-response mode:
        // 1. Try standard insert as independent row
        const newPayload: any = {
          event_id:       event.id,
          nrp:            member.nrp,
          data_respons:   dataRespons,
          is_form_filled: true,
        };
        const { error: errInsert } = await supabase.from('absensi').insert(newPayload);

        // 2. If insert fails because UNIQUE(event_id, nrp) constraint is still active in Postgres
        if (errInsert && (errInsert.code === '23505' || errInsert.message?.includes('duplicate key') || errInsert.message?.includes('unique'))) {
          const { data: firstRow } = await supabase
            .from('absensi')
            .select('*')
            .eq('event_id', event.id)
            .eq('nrp', member.nrp)
            .maybeSingle();

          if (firstRow) {
            const existingSubs = firstRow.data_respons?.__submissions || [
              {
                submission_no: 1,
                created_at: firstRow.created_at,
                data_respons: firstRow.data_respons || {},
              }
            ];
            const newEntry = {
              submission_no: existingSubs.length + 1,
              created_at: new Date().toISOString(),
              data_respons: dataRespons,
            };
            const { error: errFallback } = await supabase.from('absensi').update({
              data_respons: {
                ...firstRow.data_respons,
                ...dataRespons,
                __submissions: [...existingSubs, newEntry],
              },
              is_form_filled: true,
            }).eq('id', firstRow.id);
            saveError = errFallback;
          } else {
            saveError = errInsert;
          }
        } else {
          saveError = errInsert;
        }
      }
    }

    if (saveError) {
      setSubmitState('error');
      setErrorMsg(saveError.message);
    } else {
      setSubmitState('success');
      fetchExistingAbsensi();
      fetchQuotaCounts();
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
    return <AbsensiFormSkeleton />;
  }

  // ── If user is NOT logged in ──
  if (!member) {
    return (
      <div className="tech-card p-8 sm:p-10 text-center slide-up border border-blue-500/30 shadow-2xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mx-auto">
          <LockSimple size={32} weight="bold" className="text-blue-300" />
        </div>
        <h3 className="text-xl font-extrabold text-white">Login Anggota Diperlukan</h3>
        <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
          Silakan masuk dengan NRP &amp; Password Anda untuk mengisi formulir atau mengakses kegiatan ini.
        </p>
        <Link
          href="/login"
          className="btn-primary h-12 text-xs uppercase tracking-wider font-bold shadow-lg"
        >
          Masuk Anggota Sekarang
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
    );
  }

  // ── Success State for Absensi Form ───────────────────────────
  if (submitState === 'success' && tabMode === 'form') {
    return (
      <div className="tech-card p-8 sm:p-10 text-center slide-up space-y-5 border border-emerald-500/30">
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
          <CheckCircle size={44} weight="fill" className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-2xl font-extrabold text-white">
            {existingAbsensi ? 'Jawaban Formulir Berhasil Diperbarui!' : 'Respon Formulir Berhasil Dikirim!'}
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Halo <span className="text-blue-300 font-bold">{member.nama}</span>, data dan jawabanmu telah berhasil tercatat di sistem angkatan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
          {(maxResponses === 0 || mySubmissions.length < maxResponses) && (
            <button
              onClick={() => {
                setSubmitState('idle');
                setResponses({});
                setEditingSubmissionIndex(null);
                setIsEditing(true);
              }}
              className="btn-primary h-11 text-xs uppercase tracking-wider font-bold"
            >
              <NotePencil size={15} weight="bold" /> Kirim Tanggapan Lain (ke-{mySubmissions.length + 1})
            </button>
          )}
          {isQrEnabled && (
            <button
              onClick={() => { setSubmitState('idle'); setTabMode('qr'); }}
              className="btn-secondary h-11 text-xs uppercase tracking-wider font-bold"
            >
              <DeviceMobile size={15} weight="bold" /> Tampilkan Tiket QR
            </button>
          )}
          {isFeedbackEnabled && (
            <button
              onClick={() => { setSubmitState('idle'); setTabMode('feedback'); }}
              className="btn-secondary h-11 text-xs uppercase tracking-wider font-bold"
            >
              <Star size={15} weight="fill" /> Isi Feedback Acara
            </button>
          )}
          <Link href="/" className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors inline-flex items-center justify-center">
            Kembali ke Portal Beranda
          </Link>
        </div>
      </div>
    );
  }

  const allUploadsComplete = !Object.values(uploading).some(Boolean);

  return (
    <div className="space-y-6">
      {/* ── Logged-in Member Auto-Greeting Card ── */}
      <div className="tech-card p-4 sm:p-5 slide-up flex items-center gap-4 border border-blue-500/20">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 border border-blue-400/40 flex items-center justify-center text-white font-extrabold text-lg shrink-0 shadow-md">
          {member.nama.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-extrabold text-sm sm:text-base truncate tracking-tight">{member.nama}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full badge-tech-amber font-mono font-bold">
              {member.nrp}
            </span>
          </div>
          <p className="text-slate-400 text-xs truncate mt-0.5">{member.program_studi}</p>
        </div>
      </div>

      {/* ── Tab Selector Bar (IFEST 2026 Segmented Control) ── */}
      {(isQrEnabled || isFeedbackEnabled) && (
        <div className={`grid ${isQrEnabled && isFeedbackEnabled ? 'grid-cols-3' : 'grid-cols-2'} p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 slide-up gap-1.5`}>
          <button
            type="button"
            onClick={() => setTabMode('form')}
            className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              tabMode === 'form'
                ? 'bg-[#214afe] text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <NotePencil size={15} weight="bold" />
            <span>Formulir</span>
          </button>
          {isQrEnabled && (
            <button
              type="button"
              onClick={() => setTabMode('qr')}
              className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                tabMode === 'qr'
                  ? 'bg-[#ffc878] text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DeviceMobile size={15} weight="bold" />
              Tiket QR <span className="hidden sm:inline">Saya</span>
            </button>
          )}
          {isFeedbackEnabled && (
            <button
              type="button"
              onClick={() => setTabMode('feedback')}
              className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                tabMode === 'feedback'
                  ? 'bg-[#214afe] text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star size={15} weight={tabMode === 'feedback' ? 'fill' : 'regular'} />
              Feedback <span className="hidden sm:inline">Acara</span>
            </button>
          )}
        </div>
      )}

      {/* ── TAB 2: QR CODE TICKET ── */}
      {isQrEnabled && tabMode === 'qr' && (
        <MemberQRCard event={event} member={member} absensi={existingAbsensi} />
      )}

      {/* ── TAB 1: FORMULIR ── */}
      {tabMode === 'form' && (
        <form onSubmit={handleSubmit} className="tech-card p-6 sm:p-8 slide-up space-y-6 border border-blue-500/25">
          <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <NotePencil size={18} weight="bold" className="text-blue-400" />
                Formulir Kegiatan
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {event.nama_event} &mdash; Angkatan 2026
              </p>
            </div>
            {isEditing && mySubmissions.length > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {editingSubmissionIndex !== null ? `Edit Respon #${editingSubmissionIndex + 1}` : `Respon Baru (${mySubmissions.length + 1})`}
              </span>
            )}
          </div>

          {/* Riwayat Tanggapan if user already submitted */}
          {mySubmissions.length > 0 && !isEditing && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-4 slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl p-2 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30">📋</span>
                  <div>
                    <h4 className="text-white font-bold text-sm sm:text-base">Riwayat Tanggapan Anda</h4>
                    <p className="text-slate-400 text-xs">
                      Tercatat <span className="text-blue-300 font-bold font-mono">{mySubmissions.length}</span> tanggapan
                      {maxResponses > 0 ? ` dari batas ${maxResponses}x pengisian` : ' (Bebas / Multi-Respon)'}.
                    </p>
                  </div>
                </div>
                {(maxResponses === 0 || mySubmissions.length < maxResponses) && (
                  <button
                    type="button"
                    onClick={() => {
                      setResponses({});
                      setEditingSubmissionIndex(null);
                      setIsEditing(true);
                      setSubmitState('idle');
                    }}
                    className="btn-primary h-9 px-3 text-xs font-bold shrink-0 shadow-md"
                  >
                    <NotePencil size={14} weight="bold" /> + Isi Formulir Lagi (Tanggapan ke-{mySubmissions.length + 1})
                  </button>
                )}
              </div>

              {/* List of submissions */}
              <div className="space-y-2.5">
                {mySubmissions.map((sub, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-600 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Tanggapan #{sub.submission_no}
                        </span>
                        <span className="text-slate-400 text-xs font-mono">
                          {new Date(sub.created_at).toLocaleString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })} WIB
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                        {Object.entries(sub.data_respons)
                          .filter(([k]) => !k.startsWith('__'))
                          .slice(0, 3)
                          .map(([k, v], vIdx) => (
                            <span key={vIdx} className="truncate max-w-xs">
                              <strong className="text-slate-400 font-medium">{k}:</strong> {String(v)}
                            </span>
                          ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubmissionIndex(sIdx);
                        setResponses(sub.data_respons);
                        setIsEditing(true);
                        setSubmitState('idle');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center"
                    >
                      <PencilSimple size={12} weight="bold" /> Edit Tanggapan #{sub.submission_no}
                    </button>
                  </div>
                ))}
              </div>

              {maxResponses > 0 && mySubmissions.length >= maxResponses && (
                <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  <span>ℹ️</span>
                  <span>Batas pengisian ({maxResponses}x) telah terpenuhi. Kamu masih dapat mengubah jawaban tanggapan yang telah dikirim di atas.</span>
                </p>
              )}
            </div>
          )}

          {/* Dynamic fields */}
          {isEditing && (event.form_schema as FormField[]).length > 0 && (
            <div className="space-y-5 fade-in">
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-600/15 border border-blue-500/30 text-xs">
                <div className="flex items-center gap-2 text-blue-300">
                  <PencilSimple size={14} weight="bold" className="shrink-0" />
                  <span>
                    {editingSubmissionIndex !== null
                      ? `Kamu sedang mengubah jawaban Tanggapan #${mySubmissions[editingSubmissionIndex]?.submission_no ?? editingSubmissionIndex + 1}`
                      : `Kamu sedang mengisi Tanggapan Baru (ke-${mySubmissions.length + 1})`}
                  </span>
                </div>
                {mySubmissions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingSubmissionIndex(mySubmissions.length - 1);
                      setResponses(mySubmissions[mySubmissions.length - 1].data_respons);
                    }}
                    className="text-slate-400 hover:text-white transition-colors underline font-medium text-[11px]"
                  >
                    Batal
                  </button>
                )}
              </div>

              {(event.form_schema as FormField[])
                .filter((field) => isFieldVisible(field))
                .map((field, idx) => {
                  if (field.type === 'info') {
                    return (
                      <div key={idx} className="p-4 rounded-xl bg-amber-600/5 border border-amber-500/20 slide-up">
                        {field.label && (
                          <p className="text-amber-300 font-semibold text-sm mb-2 flex items-center gap-2">
                            <Lightbulb size={15} weight="bold" className="shrink-0" /> {field.label}
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
                            <CheckCircle size={18} weight="fill" className="text-green-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-green-300 text-sm font-medium">File tersimpan</p>
                              <a
                                href={responses[field.label]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors truncate block"
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
                              ? 'border-blue-500/50 bg-blue-600/10'
                              : 'border-slate-600/50 hover:border-blue-500/50 hover:bg-blue-600/5'
                          }`}>
                            {isUploading ? (
                              <span className="text-blue-400 text-sm">Mengupload...</span>
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
                          aria-required={field.required}
                          placeholder={`Isi ${field.label.toLowerCase()}...`}
                          className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 text-sm transition-all"
                        />
                      )}

                      {field.type === 'textarea' && (
                        <textarea
                          value={responses[field.label] || ''}
                          onChange={(e) => setResponses((prev) => ({ ...prev, [field.label]: e.target.value }))}
                          required={field.required}
                          aria-required={field.required}
                          rows={3}
                          placeholder={`Isi ${field.label.toLowerCase()}...`}
                          className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 text-sm transition-all resize-none"
                        />
                      )}

                      {field.type === 'select' && field.options && (
                        <div>
                          <div className="relative">
                            <select
                              value={responses[field.label] || ''}
                              onChange={(e) => setResponses((prev) => ({ ...prev, [field.label]: e.target.value }))}
                              required={field.required}
                              aria-required={field.required}
                              className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white text-sm transition-all appearance-none cursor-pointer pr-10"
                            >
                              <option value="" disabled className="bg-slate-800">Pilih {field.label.toLowerCase()}...</option>
                              {field.options.map((opt, i) => {
                                let isFull = false;
                                let quotaText = '';

                                if (field.enable_quota && field.option_quotas) {
                                  const quota = field.option_quotas[opt];
                                  if (quota !== undefined && quota > 0) {
                                    const used = quotaCounts[field.label]?.[opt] || 0;
                                    const isCurrentSelection = (existingAbsensi?.data_respons?.[field.label] === opt) || (responses[field.label] === opt);
                                    const remaining = quota - used;

                                    if (remaining <= 0 && !isCurrentSelection) {
                                      isFull = true;
                                      quotaText = ` (Penuh • 0/${quota})`;
                                    } else {
                                      const displayRemaining = isCurrentSelection && remaining <= 0 ? 1 : Math.max(0, remaining);
                                      quotaText = ` (Sisa: ${displayRemaining}/${quota})`;
                                    }
                                  }
                                }

                                return (
                                  <option
                                    key={i}
                                    value={opt}
                                    disabled={isFull}
                                    className={`bg-slate-800 ${isFull ? 'text-slate-500 line-through' : 'text-white'}`}
                                  >
                                    {opt}{quotaText}
                                  </option>
                                );
                              })}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                          {field.enable_quota && (
                            <p className="text-[11px] text-amber-400/90 mt-1.5 flex items-center gap-1.5 font-medium">
                              <span>🎯</span>
                              <span>Pilihan ini dibatasi kuota. Opsi yang telah penuh otomatis dinonaktifkan.</span>
                            </p>
                          )}
                        </div>
                      )}

                      {field.type === 'radio' && field.options && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2.5">
                            {field.options.map((opt, i) => {
                              let isFull = false;
                              let quotaBadge = null;

                              if (field.enable_quota && field.option_quotas) {
                                const quota = field.option_quotas[opt];
                                if (quota !== undefined && quota > 0) {
                                  const used = quotaCounts[field.label]?.[opt] || 0;
                                  const isCurrentSelection = (existingAbsensi?.data_respons?.[field.label] === opt) || (responses[field.label] === opt);
                                  const remaining = quota - used;

                                  if (remaining <= 0 && !isCurrentSelection) {
                                    isFull = true;
                                    quotaBadge = (
                                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 ml-auto shrink-0">
                                        Penuh (0/{quota})
                                      </span>
                                    );
                                  } else {
                                    const displayRemaining = isCurrentSelection && remaining <= 0 ? 1 : Math.max(0, remaining);
                                    quotaBadge = (
                                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 ml-auto shrink-0">
                                        Sisa {displayRemaining}/${quota}
                                      </span>
                                    );
                                  }
                                }
                              }

                              return (
                                <label
                                  key={i}
                                  className={`flex items-center gap-2.5 min-h-[44px] px-4 py-2.5 rounded-xl border transition-all text-sm select-none ${
                                    isFull
                                      ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-500'
                                      : responses[field.label] === opt
                                      ? 'border-blue-500 bg-blue-600/20 text-blue-200 cursor-pointer'
                                      : 'border-slate-600/50 bg-slate-800/40 text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`field-${idx}`}
                                    value={opt}
                                    disabled={isFull}
                                    checked={responses[field.label] === opt}
                                    onChange={() => !isFull && setResponses((prev) => ({ ...prev, [field.label]: opt }))}
                                    required={field.required && !responses[field.label]}
                                    aria-required={field.required}
                                    className="sr-only"
                                  />
                                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${responses[field.label] === opt ? 'border-blue-400' : 'border-slate-500'}`}>
                                    {responses[field.label] === opt && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                                  </span>
                                  <span className="truncate">{opt}</span>
                                  {quotaBadge}
                                </label>
                              );
                            })}
                          </div>
                          {field.enable_quota && (
                            <p className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1.5 font-medium">
                              <span>🎯</span>
                              <span>Pilihan ini dibatasi kuota. Pilihan yang penuh tidak dapat dipilih.</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {submitState === 'error' && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 fade-in">
              <Warning size={15} weight="bold" className="shrink-0" />
              <span>{errorMsg || 'Terjadi kesalahan. Silakan coba lagi.'}</span>
            </div>
          )}

          {isEditing && (
            <button
              type="submit"
              disabled={submitState === 'loading' || !allUploadsComplete}
              className="w-full btn-primary h-12 text-sm uppercase tracking-wider font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitState === 'loading' || !allUploadsComplete ? (
                <span>Menyimpan Tanggapan...</span>
              ) : editingSubmissionIndex !== null ? (
                `Simpan Perubahan Tanggapan #${mySubmissions[editingSubmissionIndex]?.submission_no ?? editingSubmissionIndex + 1} →`
              ) : mySubmissions.length > 0 ? (
                `Kirim Tanggapan ke-${mySubmissions.length + 1} Sekarang →`
              ) : (
                'Kirim Formulir Sekarang →'
              )}
            </button>
          )}
        </form>
      )}

      {/* ── TAB 3: FORM FEEDBACK & EVALUASI ACARA ── */}
      {isFeedbackEnabled && tabMode === 'feedback' && (
        <div className="tech-card p-6 sm:p-8 slide-up space-y-6 border border-blue-500/25">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Star size={18} weight="fill" className="text-[#ffc878]" />
              Feedback &amp; Evaluasi Acara
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Berikan penilaian dan masukan Anda untuk peningkatan kualitas acara mendatang.
            </p>
          </div>

          {/* Feedback Success View */}
          {feedbackSubmitState === 'success' && (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center slide-up space-y-3">
              <Confetti size={44} weight="fill" className="mx-auto text-emerald-400" />
              <h3 className="text-lg font-extrabold text-white">Terima Kasih atas Ulasan &amp; Feedback Anda!</h3>
              <p className="text-emerald-300 text-xs">Masukan Anda telah berhasil dicatat untuk evaluasi panitia.</p>
              <button
                type="button"
                onClick={() => { setFeedbackSubmitState('idle'); setIsEditingFeedback(true); }}
                className="btn-secondary h-10 text-xs font-bold uppercase tracking-wider"
              >
                <PencilSimple size={13} weight="bold" /> Edit Respon Feedback
              </button>
            </div>
          )}

          {/* Existing Feedback Notice */}
          {existingFeedback && !isEditingFeedback && feedbackSubmitState !== 'success' && (
            <div className="p-5 rounded-2xl bg-blue-950/40 border border-blue-500/30 space-y-3 slide-up">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full badge-tech-amber font-semibold">
                    <CheckCircle size={11} weight="fill" /> Feedback Sudah Dikirim
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
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl btn-primary text-xs font-semibold transition-all shadow"
                >
                  <PencilSimple size={13} weight="bold" /> Edit Feedback
                </button>
              </div>

              {/* Show previous answers summary */}
              {existingFeedback.data_respons && Object.keys(existingFeedback.data_respons).length > 0 && (
                <div className="pt-3 border-t border-amber-500/20 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Rincian Penilaian & Masukan Anda:</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {feedbackSchema.map((field, i) => {
                      const val = existingFeedback.data_respons?.[field.label];
                      const note = existingFeedback.data_respons?.[`${field.label}__catatan`];
                      if (!val && !note) return null;

                      if (field.type === 'rating' || field.type === 'scale') {
                        return (
                          <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300 font-semibold text-xs">{field.label}:</span>
                              {field.type === 'rating' ? (
                                <span className="text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                  ★ {val} / 5
                                </span>
                              ) : (
                                <span className="text-blue-300 font-mono font-bold text-xs bg-blue-600/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                                  Skala {val} / 10
                                </span>
                              )}
                            </div>
                            {note ? (
                              <div className="text-xs text-slate-300 bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
                                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Catatan:</span>
                                <span className="italic">"{String(note)}"</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic block">— Tidak ada catatan</span>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs">
                          <span className="text-slate-400 font-semibold block mb-1">{field.label}:</span>
                          <span className="text-white font-medium whitespace-pre-line">{String(val)}</span>
                        </div>
                      );
                    })}

                    {/* Overall note if any */}
                    {existingFeedback.data_respons?.['Ulasan Keseluruhan Acara'] && (
                      <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs">
                        <span className="text-blue-300 font-semibold block mb-1">Ulasan Keseluruhan Acara:</span>
                        <span className="text-white italic">"{String(existingFeedback.data_respons['Ulasan Keseluruhan Acara'])}"</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback Form Inputs */}
          {isEditingFeedback && feedbackSubmitState !== 'success' && (
            <form onSubmit={handleFeedbackSubmit} className="space-y-5 fade-in">
              {/* Overall Star Rating + Sub-unit Comment */}
              <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3.5">
                <div className="text-center space-y-2">
                  <label className="block text-sm font-semibold text-slate-200">
                    Seberapa puas Anda dengan acara ini secara keseluruhan? <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center justify-center gap-1 sm:gap-2 py-1 flex-wrap">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isSelected = overallRating > 0 && star <= overallRating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setOverallRating(star)}
                          className="min-w-[44px] min-h-[44px] p-2 text-3xl sm:text-4xl transition-all hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl flex items-center justify-center"
                          aria-label={`Beri rating ${star} dari 5 bintang`}
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
                      <span className="text-blue-300/80 italic font-medium">
                        Klik salah satu bintang di atas untuk memberi rating (1–5)
                      </span>
                    ) : overallRating === 5 ? (
                      <span className="text-amber-300 font-bold">Sangat Puas / Luar Biasa! (5/5)</span>
                    ) : overallRating === 4 ? (
                      <span className="text-amber-300 font-bold">Puas / Bagus Sekali (4/5)</span>
                    ) : overallRating === 3 ? (
                      <span className="text-amber-300 font-bold">Cukup / Rata-rata (3/5)</span>
                    ) : overallRating === 2 ? (
                      <span className="text-amber-300 font-bold">Kurang Puas (2/5)</span>
                    ) : (
                      <span className="text-amber-300 font-bold">Sangat Kurang (1/5)</span>
                    )}
                  </div>
                </div>

                {/* Sub-unit comment for overall rating */}
                <div className="pt-3 border-t border-slate-700/50">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <ChatCircle size={13} weight="bold" className="shrink-0" /> Ulasan / Kesan Keseluruhan Acara (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={feedbackResponses['Ulasan Keseluruhan Acara'] || ''}
                    onChange={(e) => setFeedbackResponses((prev) => ({ ...prev, 'Ulasan Keseluruhan Acara': e.target.value }))}
                    placeholder="Tulis ulasan, kesan & pesan umum Anda selama mengikuti kegiatan ini..."
                    className="input-glow w-full bg-slate-900/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Dynamic feedback custom fields */}
              {feedbackSchema.map((field, idx) => {
                if (field.type === 'rating') {
                  const currentVal = feedbackResponses[field.label] !== undefined ? Number(feedbackResponses[field.label]) : 0;
                  return (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-300">
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </label>
                        <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const isSel = currentVal > 0 && s <= currentVal;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setFeedbackResponses((prev) => ({ ...prev, [field.label]: s }))}
                                className="min-w-[44px] min-h-[44px] p-2 text-2xl sm:text-3xl transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl flex items-center justify-center"
                                aria-label={`Beri rating ${s} bintang untuk ${field.label}`}
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

                      {/* Sub-unit text feedback paired with this star rating */}
                      <div className="pt-2.5 border-t border-slate-700/40">
                        <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                          <ChatCircle size={12} weight="bold" className="shrink-0" /> Masukan / Alasan Penilaian (Opsional):
                        </label>
                        <input
                          type="text"
                          value={feedbackResponses[`${field.label}__catatan`] || ''}
                          onChange={(e) => setFeedbackResponses((prev) => ({ ...prev, [`${field.label}__catatan`]: e.target.value }))}
                          placeholder={`Tulis masukan atau alasan rating untuk "${field.label}"...`}
                          className="input-glow w-full bg-slate-900/70 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 transition-all"
                        />
                      </div>
                    </div>
                  );
                }

                if (field.type === 'scale') {
                  const currentScale = feedbackResponses[field.label] !== undefined ? Number(feedbackResponses[field.label]) : null;
                  return (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-300">
                            {field.label} {field.required && <span className="text-red-400">*</span>}
                          </label>
                          <span className="text-xs text-blue-300 font-mono">
                            {currentScale !== null ? `Skala: ${currentScale}/10` : <span className="text-slate-500 italic">Belum dipilih</span>}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setFeedbackResponses((prev) => ({ ...prev, [field.label]: num }))}
                              className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                                currentScale === num
                                  ? 'bg-blue-600 text-white glow-blue scale-105 shadow-md'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                              }`}
                              aria-label={`Pilih skala nilai ${num} dari 10 untuk ${field.label}`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sub-unit text feedback paired with this scale */}
                      <div className="pt-2.5 border-t border-slate-700/40">
                        <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                          <ChatCircle size={12} weight="bold" className="shrink-0" /> Masukan / Alasan Penilaian (Opsional):
                        </label>
                        <input
                          type="text"
                          value={feedbackResponses[`${field.label}__catatan`] || ''}
                          onChange={(e) => setFeedbackResponses((prev) => ({ ...prev, [`${field.label}__catatan`]: e.target.value }))}
                          placeholder={`Tulis masukan atau alasan penilaian skala untuk "${field.label}"...`}
                          className="input-glow w-full bg-slate-900/70 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 transition-all"
                        />
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
                <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 fade-in">
                  <Warning size={15} weight="bold" className="shrink-0" />
                  <span>{feedbackErrorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={feedbackSubmitState === 'loading'}
                className="w-full btn-primary h-12 text-sm font-bold uppercase tracking-wider rounded-xl shadow-lg disabled:opacity-50"
              >
                {feedbackSubmitState === 'loading' ? 'Mengirim Feedback...' : 'Kirim Ulasan & Feedback Acara →'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
