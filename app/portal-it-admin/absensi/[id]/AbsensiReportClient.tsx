'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Event, Anggota, Absensi, Feedback, FormField } from '@/lib/types';
import { parseEventConfig } from '@/lib/eventConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  event: Event;
  allAnggota: Anggota[];
  absensiList: Absensi[];
  feedbackList?: Feedback[];
}

type MainViewTab = 'respon' | 'audit' | 'feedback';
type AuditFilter = 'all' | 'belum' | 'sudah';
type SortOrder = 'asc' | 'desc';

export interface FlattenedSubmission {
  id: string;
  absensiId: string;
  nrp: string;
  nama: string;
  program_studi: string;
  submission_no: number;
  created_at: string;
  qr_scanned_at?: string | null;
  is_qr_scanned: boolean;
  data_respons: Record<string, any>;
  is_sub_entry: boolean;
  sub_index?: number;
}

interface DeleteTarget {
  absensiId: string;
  nama: string;
  nrp: string;
  submissionNo?: number;
  subIndex?: number;
  isSubEntry?: boolean;
}

export default function AbsensiReportClient({
  event,
  allAnggota,
  absensiList: initialAbsensiList,
  feedbackList: initialFeedbackList = [],
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const { is_qr_enabled: isQrEnabled, is_feedback_enabled: isFeedbackEnabled } = parseEventConfig(event);

  const [mainTab, setMainTab] = useState<MainViewTab>('respon');

  // Filter states for Tab 1 (Respon Masuk)
  const [searchRespon, setSearchRespon] = useState('');
  const [filterProdi, setFilterProdi] = useState('all');
  const [filterSubmissionNo, setFilterSubmissionNo] = useState<string>('all');
  const [selectedRespField, setSelectedRespField] = useState('all');
  const [selectedRespVal, setSelectedRespVal] = useState('all');
  const [sortKey, setSortKey] = useState<string>('waktu');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter states for Tab 2 (Audit Angkatan)
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all');
  const [searchAudit, setSearchAudit] = useState('');
  const [auditProdi, setAuditProdi] = useState('all');
  const [copiedAuditToast, setCopiedAuditToast] = useState<string | null>(null);

  // Data states
  const [absensiList, setAbsensiList] = useState<Absensi[]>(initialAbsensiList);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>(initialFeedbackList);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [detailTarget, setDetailTarget] = useState<FlattenedSubmission | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setAbsensiList(initialAbsensiList); }, [initialAbsensiList]);
  useEffect(() => { setFeedbackList(initialFeedbackList); }, [initialFeedbackList]);

  const formFields: FormField[] = (event.form_schema ?? []).filter((f) => f.type !== 'info');
  const feedbackSchema: FormField[] = (event.feedback_schema ?? []).filter((f) => f.type !== 'info');

  // Lookup map for fast student info
  const anggotaMap = useMemo(() => {
    const map: Record<string, Anggota> = {};
    allAnggota.forEach((a) => { map[a.nrp] = a; });
    return map;
  }, [allAnggota]);

  // Program studi options
  const prodiOptions = useMemo(() => {
    const set = new Set<string>();
    allAnggota.forEach((a) => { if (a.program_studi) set.add(a.program_studi); });
    return Array.from(set).sort();
  }, [allAnggota]);

  // ── UNPACK ALL SUBMISSIONS INTO INDIVIDUAL ROWS ──────────────
  const allSubmissions = useMemo<FlattenedSubmission[]>(() => {
    const list: FlattenedSubmission[] = [];

    absensiList.forEach((a) => {
      const ang = anggotaMap[a.nrp] || a.anggota;
      const nama = ang?.nama || a.nrp;
      const prodi = ang?.program_studi || '-';

      const packed = (a.data_respons as any)?.__submissions;
      if (Array.isArray(packed) && packed.length > 0) {
        packed.forEach((sub: any, sIdx: number) => {
          list.push({
            id: `${a.id}-sub-${sIdx}`,
            absensiId: a.id,
            nrp: a.nrp,
            nama,
            program_studi: prodi,
            submission_no: sub.submission_no || sIdx + 1,
            created_at: sub.created_at || a.created_at,
            qr_scanned_at: a.qr_scanned_at,
            is_qr_scanned: !!a.is_qr_scanned,
            data_respons: sub.data_respons || {},
            is_sub_entry: true,
            sub_index: sIdx,
          });
        });
      } else if (a.is_form_filled || (a.data_respons && Object.keys(a.data_respons).length > 0)) {
        list.push({
          id: a.id,
          absensiId: a.id,
          nrp: a.nrp,
          nama,
          program_studi: prodi,
          submission_no: a.submission_no || 1,
          created_at: a.created_at,
          qr_scanned_at: a.qr_scanned_at,
          is_qr_scanned: !!a.is_qr_scanned,
          data_respons: a.data_respons || {},
          is_sub_entry: false,
        });
      } else if (isQrEnabled && a.is_qr_scanned) {
        list.push({
          id: a.id,
          absensiId: a.id,
          nrp: a.nrp,
          nama,
          program_studi: prodi,
          submission_no: 1,
          created_at: a.qr_scanned_at || a.created_at,
          qr_scanned_at: a.qr_scanned_at,
          is_qr_scanned: true,
          data_respons: {},
          is_sub_entry: false,
        });
      }
    });

    return list;
  }, [absensiList, anggotaMap, isQrEnabled]);

  // Unique NRPs that have submitted at least once
  const filledNrpSet = useMemo(() => {
    return new Set(allSubmissions.map((s) => s.nrp));
  }, [allSubmissions]);

  // ── AUDIT LIST (SELURUH NRP ANGKATAN DIALIHFUNGSIKAN) ────────
  const auditList = useMemo(() => {
    return allAnggota.map((a) => {
      const studentSubs = allSubmissions.filter((sub) => sub.nrp === a.nrp);
      const abs = absensiList.find((x) => x.nrp === a.nrp);
      const isQrScanned = isQrEnabled ? !!abs?.is_qr_scanned : false;
      const count = studentSubs.length;
      const isFilled = count > 0;
      const latestTime = studentSubs.length > 0 ? studentSubs[studentSubs.length - 1].created_at : (abs?.created_at || null);

      return {
        ...a,
        submission_count: count,
        is_filled: isFilled,
        is_qr_scanned: isQrScanned,
        latest_time: latestTime,
        submissions: studentSubs,
        absensi: abs,
      };
    });
  }, [allAnggota, allSubmissions, absensiList, isQrEnabled]);

  // KPI Metrics
  const totalAnggota = allAnggota.length;
  const totalSubmissions = allSubmissions.length;
  const countMahasiswaMengisi = filledNrpSet.size;
  const countBelumMengisi = Math.max(0, totalAnggota - countMahasiswaMengisi);
  const percentPartisipasi = totalAnggota > 0 ? Math.round((countMahasiswaMengisi / totalAnggota) * 100) : 0;
  const countFeedback = feedbackList.length;

  const avgRating = useMemo(() => {
    const validRatings = feedbackList
      .map((f) => Number(f.rating_overall))
      .filter((r) => !isNaN(r) && r > 0);
    if (validRatings.length === 0) return '0.0';
    const sum = validRatings.reduce((a, b) => a + b, 0);
    return (sum / validRatings.length).toFixed(1);
  }, [feedbackList]);

  // ── DROPDOWN QUOTA SUMMARY ──────────────────────────────────
  const quotaSummary = useMemo(() => {
    const fieldsWithQuota = formFields.filter((f) => f.enable_quota && f.option_quotas);
    if (fieldsWithQuota.length === 0) return [];

    return fieldsWithQuota.map((field) => {
      const options = field.options || [];
      const quotas = field.option_quotas || {};

      const counts: Record<string, number> = {};
      allSubmissions.forEach((s) => {
        const val = String(s.data_respons?.[field.label] || '');
        if (val) counts[val] = (counts[val] || 0) + 1;
      });

      const items = options.map((opt) => {
        const limit = quotas[opt];
        const used = counts[opt] || 0;
        const isLimited = limit !== undefined && limit > 0;
        const remaining = isLimited ? Math.max(0, limit - used) : null;
        const percentage = isLimited ? Math.min(100, Math.round((used / limit) * 100)) : null;
        const isFull = isLimited ? used >= limit : false;

        return {
          opt,
          limit,
          used,
          isLimited,
          remaining,
          percentage,
          isFull,
        };
      });

      return {
        fieldLabel: field.label,
        items,
      };
    });
  }, [formFields, allSubmissions]);

  // ── FILTERED & SORTED SUBMISSIONS FOR TAB 1 ─────────────────
  const processedSubmissions = useMemo(() => {
    let list = [...allSubmissions];

    if (searchRespon.trim()) {
      const q = searchRespon.toLowerCase();
      list = list.filter(
        (s) =>
          s.nrp.toLowerCase().includes(q) ||
          s.nama.toLowerCase().includes(q) ||
          s.program_studi.toLowerCase().includes(q) ||
          Object.values(s.data_respons).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    if (filterProdi !== 'all') {
      list = list.filter((s) => s.program_studi === filterProdi);
    }

    if (filterSubmissionNo !== 'all') {
      const no = Number(filterSubmissionNo);
      list = list.filter((s) => s.submission_no === no);
    }

    if (selectedRespField !== 'all' && selectedRespVal !== 'all') {
      list = list.filter((s) => {
        const val = String(s.data_respons?.[selectedRespField] ?? '').trim().toLowerCase();
        return val === selectedRespVal.trim().toLowerCase();
      });
    }

    // Sort
    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortKey === 'waktu') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else if (sortKey === 'nrp') {
        valA = a.nrp; valB = b.nrp;
      } else if (sortKey === 'nama') {
        valA = a.nama; valB = b.nama;
      } else if (sortKey === 'submission_no') {
        valA = a.submission_no; valB = b.submission_no;
      } else if (sortKey === 'program_studi') {
        valA = a.program_studi; valB = b.program_studi;
      } else {
        valA = String(a.data_respons?.[sortKey] ?? '');
        valB = String(b.data_respons?.[sortKey] ?? '');
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
      if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [allSubmissions, searchRespon, filterProdi, filterSubmissionNo, selectedRespField, selectedRespVal, sortKey, sortOrder]);

  // ── FILTERED AUDIT LIST FOR TAB 2 ───────────────────────────
  const processedAuditList = useMemo(() => {
    let list = [...auditList];

    if (auditFilter === 'belum') {
      list = list.filter((a) => !a.is_filled);
    } else if (auditFilter === 'sudah') {
      list = list.filter((a) => a.is_filled);
    }

    if (auditProdi !== 'all') {
      list = list.filter((a) => a.program_studi === auditProdi);
    }

    if (searchAudit.trim()) {
      const q = searchAudit.toLowerCase();
      list = list.filter(
        (a) =>
          a.nrp.toLowerCase().includes(q) ||
          a.nama.toLowerCase().includes(q) ||
          a.program_studi.toLowerCase().includes(q)
      );
    }

    return list;
  }, [auditList, auditFilter, auditProdi, searchAudit]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // ── DELETE SUBMISSION HANDLER ───────────────────────────────
  const confirmDeleteSubmission = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      if (deleteTarget.isSubEntry && deleteTarget.subIndex !== undefined) {
        // Delete packed submission entry
        const parent = absensiList.find((a) => a.id === deleteTarget.absensiId);
        if (parent) {
          const currentSubs = ((parent.data_respons as any)?.__submissions as any[]) || [];
          const updatedSubs = currentSubs.filter((_, idx) => idx !== deleteTarget.subIndex);

          if (updatedSubs.length === 0) {
            // Delete entire row
            await supabase.from('absensi').delete().eq('id', deleteTarget.absensiId);
            setAbsensiList((prev) => prev.filter((a) => a.id !== deleteTarget.absensiId));
          } else {
            const updatedDataRespons = {
              ...parent.data_respons,
              __submissions: updatedSubs,
            };
            await supabase
              .from('absensi')
              .update({ data_respons: updatedDataRespons })
              .eq('id', deleteTarget.absensiId);

            setAbsensiList((prev) =>
              prev.map((a) => (a.id === deleteTarget.absensiId ? { ...a, data_respons: updatedDataRespons } : a))
            );
          }
        }
      } else {
        // Direct row delete
        const { error } = await supabase.from('absensi').delete().eq('id', deleteTarget.absensiId);
        if (error) throw error;
        setAbsensiList((prev) => prev.filter((a) => a.id !== deleteTarget.absensiId));
      }
      router.refresh();
    } catch (err: any) {
      alert('Gagal menghapus respon: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── COPY UNFILLED NRP HELPERS (DIALIHFUNGSIKAN UNTUK SWEEPING) ──
  const copyUnfilledNrp = (mode: 'plain' | 'broadcast') => {
    const unfilled = auditList.filter((a) => !a.is_filled);
    if (unfilled.length === 0) {
      alert('Semua anggota telah mengisi formulir!');
      return;
    }

    let text = '';
    if (mode === 'plain') {
      text = unfilled.map((a) => a.nrp).join(', ');
    } else {
      text = `📢 *REMINDER PENGISIAN FORMULIR: ${event.nama_event.toUpperCase()}*\n` +
        `Halo rekan-rekan TI 2026, mohon segera melengkapi respon formulir.\n` +
        `Tercatat *${unfilled.length} mahasiswa* belum mengisi:\n\n` +
        unfilled.map((a, i) => `${i + 1}. ${a.nama} (${a.nrp})`).join('\n') +
        `\n\n🔗 Segera akses portal dan kirim formulir Anda. Terima kasih!`;
    }

    navigator.clipboard.writeText(text);
    setCopiedAuditToast(mode === 'plain' ? `✓ ${unfilled.length} NRP berhasil disalin!` : `✓ Format Pesan Broadcast WhatsApp berhasil disalin!`);
    setTimeout(() => setCopiedAuditToast(null), 3500);
  };

  // ── EXPORT PDF RESPON MASUK ─────────────────────────────────
  const generatePdfReport = async (exportAll: boolean = false) => {
    setExportingPdf(true);
    try {
      const dataToExport = exportAll ? allSubmissions : processedSubmissions;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(30, 41, 59);
      doc.text('REKAPITULASI DATA RESPON FORMULIR MASUK', 14, 15);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(33, 74, 254);
      doc.text(event.nama_event.toUpperCase(), 14, 21);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const exportDate = new Date().toLocaleString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      doc.text(`Waktu Cetak: ${exportDate} WIB | Total Respon Tercatat: ${dataToExport.length} | Portal IT 2026`, 14, 26);

      // KPI box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 30, 269, 11, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Total Terdaftar: ${totalAnggota} Mahasiswa  |  Mahasiswa Mengisi: ${countMahasiswaMengisi} (${percentPartisipasi}%)  |  Belum Mengisi: ${countBelumMengisi}  |  Total Respon Masuk: ${totalSubmissions}`,
        18,
        37
      );

      const headers = [
        'No',
        'Waktu Masuk',
        'NRP',
        'Nama Lengkap',
        'Prodi',
        'Tanggapan',
        ...formFields.slice(0, 4).map((f) => f.label),
      ];

      const tableRows = dataToExport.map((s, i) => [
        i + 1,
        new Date(s.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        s.nrp,
        s.nama,
        s.program_studi,
        `#${s.submission_no}`,
        ...formFields.slice(0, 4).map((f) => String(s.data_respons?.[f.label] ?? '-')),
      ]);

      autoTable(doc, {
        startY: 45,
        head: [headers],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
        headStyles: { fillColor: [33, 74, 254], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 26 },
          2: { cellWidth: 25, fontStyle: 'bold' },
          3: { cellWidth: 45 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20, halign: 'center' },
        },
      });

      doc.save(`Data_Respon_${event.nama_event.replace(/\s+/g, '_')}.pdf`);
    } catch (err: any) {
      alert('Gagal export PDF: ' + err?.message);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── EXPORT CSV RESPON MASUK ─────────────────────────────────
  const exportCsv = () => {
    const headers = [
      'No',
      'Waktu Masuk',
      'NRP',
      'Nama Lengkap',
      'Program Studi',
      'Tanggapan Ke',
      ...(isQrEnabled ? ['Status QR'] : []),
      ...formFields.map((f) => `"${f.label.replace(/"/g, '""')}"`),
    ];

    const rows = processedSubmissions.map((s, i) => [
      i + 1,
      `"${new Date(s.created_at).toISOString()}"`,
      `"${s.nrp}"`,
      `"${s.nama}"`,
      `"${s.program_studi}"`,
      s.submission_no,
      ...(isQrEnabled ? [s.is_qr_scanned ? 'Sudah Scan' : 'Belum'] : []),
      ...formFields.map((f) => `"${String(s.data_respons?.[f.label] ?? '').replace(/"/g, '""')}"`),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Respon_${event.nama_event.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── EXPORT FEEDBACK PDF ─────────────────────────────────────
  const generateFeedbackPdfReport = async () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('LAPORAN HASIL EVALUASI & FEEDBACK ACARA', 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(33, 74, 254);
      doc.text(event.nama_event.toUpperCase(), 14, 21);

      const tableRows = feedbackList.map((fb, idx) => {
        const ang = anggotaMap[fb.nrp];
        const overallNote = fb.data_respons?.['Ulasan Keseluruhan Acara'] || '-';
        return [
          idx + 1,
          fb.nrp,
          ang?.nama || fb.nrp,
          fb.rating_overall ? `${fb.rating_overall} / 5` : '-',
          String(overallNote),
        ];
      });

      autoTable(doc, {
        startY: 30,
        head: [['No', 'NRP', 'Nama', 'Rating', 'Catatan / Ulasan']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 8.5 },
      });

      doc.save(`Feedback_${event.nama_event.replace(/\s+/g, '_')}.pdf`);
    } catch (err: any) {
      alert('Gagal export Feedback: ' + err?.message);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── INTERACTIVE KPI METRIC CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 slide-up">
        {/* 1. Total Respon Masuk */}
        <button
          type="button"
          onClick={() => { setMainTab('respon'); setSearchRespon(''); setFilterProdi('all'); setFilterSubmissionNo('all'); }}
          className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 ${
            mainTab === 'respon'
              ? 'bg-blue-600/25 border-blue-500 shadow-lg glow-blue'
              : 'glass-card border-slate-700/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-400 mb-1">
            <span>📋 Respon Masuk</span>
            <span className="text-[10px] font-mono font-bold bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-300">Live Log</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{totalSubmissions}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Semua data form terisi</p>
        </button>

        {/* 2. Mahasiswa Mengisi */}
        <button
          type="button"
          onClick={() => { setMainTab('audit'); setAuditFilter('sudah'); }}
          className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 ${
            mainTab === 'audit' && auditFilter === 'sudah'
              ? 'bg-emerald-600/25 border-emerald-500 shadow-lg'
              : 'glass-card border-slate-700/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>👥 Mahasiswa Mengisi</span>
            <span className="text-[10px] font-bold">{percentPartisipasi}%</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-300">{countMahasiswaMengisi} <span className="text-xs font-normal text-slate-400">/ {totalAnggota}</span></p>
          <p className="text-[10px] text-slate-400 mt-0.5">Partisipasi Angkatan</p>
        </button>

        {/* 3. Belum Mengisi (Alih fungsi audit/sweeping) */}
        <button
          type="button"
          onClick={() => { setMainTab('audit'); setAuditFilter('belum'); }}
          className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 ${
            mainTab === 'audit' && auditFilter === 'belum'
              ? 'bg-amber-600/25 border-amber-500 shadow-lg'
              : 'glass-card border-slate-700/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
            <span>⏳ Belum Mengisi</span>
            <span className="text-[10px] font-bold">{100 - percentPartisipasi}%</span>
          </div>
          <p className="text-2xl font-extrabold text-amber-300">{countBelumMengisi}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Perlu difollow-up</p>
        </button>

        {/* 4. Feedback / Ulasan */}
        <button
          type="button"
          onClick={() => setMainTab('feedback')}
          className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 ${
            mainTab === 'feedback'
              ? 'bg-amber-500/20 border-amber-400 shadow-lg'
              : 'glass-card border-slate-700/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
            <span>⭐ Rating Feedback</span>
            <span className="text-[10px] font-mono">{Number(avgRating) > 0 ? `${avgRating} ★` : '-'}</span>
          </div>
          <p className="text-2xl font-extrabold text-amber-300">{countFeedback}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Ulasan Peserta</p>
        </button>
      </div>

      {/* ── DROPDOWN QUOTA MONITORING CARDS ── */}
      {quotaSummary.length > 0 && (
        <div className="tech-card rounded-2xl p-5 border border-amber-500/30 shadow-xl slide-up space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-lg p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">🎯</span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Monitoring Kuota Opsi Pilihan</h3>
                <p className="text-xs text-slate-400">Pantau sisa kuota opsi yang dipilih peserta secara otomatis</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {quotaSummary.reduce((acc, q) => acc + q.items.filter((i) => i.isFull).length, 0)} Opsi Penuh
            </span>
          </div>

          <div className="space-y-4">
            {quotaSummary.map((qGroup, gIdx) => (
              <div key={gIdx} className="space-y-2">
                <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">{qGroup.fieldLabel}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {qGroup.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className={`p-3 rounded-xl border transition-all ${
                        item.isFull
                          ? 'bg-red-950/20 border-red-500/30'
                          : item.isLimited
                          ? 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600'
                          : 'bg-slate-900/40 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-white truncate mr-2" title={item.opt}>{item.opt}</span>
                        {item.isFull ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                            PENUH
                          </span>
                        ) : item.isLimited ? (
                          <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                            Sisa: <strong className="font-bold">{item.remaining}</strong>/{item.limit}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 shrink-0">Tanpa Batas</span>
                        )}
                      </div>

                      {item.isLimited && (
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.isFull ? 'bg-red-500' : (item.percentage ?? 0) > 75 ? 'bg-amber-400' : 'bg-blue-500'
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                        <span>{item.used} terpilih</span>
                        {item.percentage !== null && <span>{item.percentage}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TOP MAIN NAVIGATION TABS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-700/70 slide-up">
        <div className="flex gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setMainTab('respon')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shrink-0 ${
              mainTab === 'respon'
                ? 'bg-blue-600 text-white shadow-lg glow-blue'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📋</span> Data Respon Masuk ({allSubmissions.length})
          </button>
          <button
            type="button"
            onClick={() => setMainTab('audit')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shrink-0 ${
              mainTab === 'audit'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>👥</span> Audit Partisipasi Angkatan ({totalAnggota})
          </button>
          {isFeedbackEnabled && (
            <button
              type="button"
              onClick={() => setMainTab('feedback')}
              className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
                mainTab === 'feedback'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>⭐</span> Rekap Feedback ({countFeedback})
            </button>
          )}
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => generatePdfReport(false)}
            disabled={exportingPdf}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>📄</span> {exportingPdf ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow flex items-center justify-center gap-1.5"
          >
            <span>📊</span> Export CSV
          </button>
        </div>
      </div>

      {/* ── TAB 1: DATA RESPON MASUK (SETIAP NRP & NAMA MASUK SESUAI PENGISIAN) ── */}
      {mainTab === 'respon' && (
        <div className="space-y-4 slide-up">
          {/* Filter Bar */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🔍</span> Filter Log Respon Masuk
              </span>
              {(searchRespon || filterProdi !== 'all' || filterSubmissionNo !== 'all' || selectedRespField !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchRespon('');
                    setFilterProdi('all');
                    setFilterSubmissionNo('all');
                    setSelectedRespField('all');
                    setSelectedRespVal('all');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  ↺ Reset Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Search */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Cari NRP / Nama / Jawaban:</label>
                <input
                  type="text"
                  value={searchRespon}
                  onChange={(e) => setSearchRespon(e.target.value)}
                  placeholder="Ketik kata kunci..."
                  className="input-glow w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              {/* Filter Prodi */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Program Studi:</label>
                <select
                  value={filterProdi}
                  onChange={(e) => setFilterProdi(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">Semua Program Studi</option>
                  {prodiOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Filter Tanggapan Ke- */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Tanggapan Ke-:</label>
                <select
                  value={filterSubmissionNo}
                  onChange={(e) => setFilterSubmissionNo(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">Semua Tanggapan (1, 2, dst)</option>
                  <option value="1">Hanya Tanggapan #1</option>
                  <option value="2">Hanya Tanggapan #2</option>
                  <option value="3">Hanya Tanggapan #3</option>
                </select>
              </div>

              {/* Filter Dropdown Question */}
              {formFields.filter((f) => f.options && f.options.length > 0).length > 0 && (
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Filter Jawaban Opsi:</label>
                  <div className="flex gap-1.5">
                    <select
                      value={selectedRespField}
                      onChange={(e) => {
                        setSelectedRespField(e.target.value);
                        setSelectedRespVal('all');
                      }}
                      className="w-1/2 bg-slate-800/90 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:border-blue-500 focus:outline-none truncate"
                    >
                      <option value="all">Pilih Pertanyaan</option>
                      {formFields
                        .filter((f) => f.options && f.options.length > 0)
                        .map((f) => (
                          <option key={f.label} value={f.label}>{f.label}</option>
                        ))}
                    </select>

                    <select
                      value={selectedRespVal}
                      disabled={selectedRespField === 'all'}
                      onChange={(e) => setSelectedRespVal(e.target.value)}
                      className="w-1/2 bg-slate-800/90 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 truncate"
                    >
                      <option value="all">Semua Opsi</option>
                      {(formFields.find((f) => f.label === selectedRespField)?.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Data Respon Masuk */}
          <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <span>📋</span> Data Respon Formulir Masuk
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Menampilkan <strong className="text-white font-mono">{processedSubmissions.length}</strong> dari total {allSubmissions.length} data tanggapan
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                Log Per-Tanggapan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('waktu')}
                    >
                      Waktu {sortKey === 'waktu' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('nrp')}
                    >
                      NRP {sortKey === 'nrp' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('nama')}
                    >
                      Nama Mahasiswa {sortKey === 'nama' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-white transition-colors hidden md:table-cell"
                      onClick={() => handleSort('program_studi')}
                    >
                      Prodi {sortKey === 'program_studi' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('submission_no')}
                    >
                      Respon {sortKey === 'submission_no' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>

                    {/* Dynamic Question Columns */}
                    {formFields.slice(0, 4).map((field) => (
                      <th
                        key={field.label}
                        className="py-3 px-3 cursor-pointer hover:text-white transition-colors hidden lg:table-cell max-w-[180px] truncate"
                        onClick={() => handleSort(field.label)}
                        title={field.label}
                      >
                        {field.label} {sortKey === field.label && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}

                    <th className="py-3 px-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {processedSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6 + Math.min(4, formFields.length)} className="text-center py-12 text-slate-500">
                        Belum ada respon masuk yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    processedSubmissions.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(row.created_at).toLocaleString('id-ID', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-300">{row.nrp}</td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <div>{row.nama}</div>
                          <div className="text-[10px] text-slate-500 font-normal md:hidden">{row.program_studi}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-400 hidden md:table-cell">{row.program_studi}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            row.submission_no > 1
                              ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                              : 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                          }`}>
                            Ke-{row.submission_no}
                          </span>
                        </td>

                        {/* Answers */}
                        {formFields.slice(0, 4).map((field) => {
                          const val = row.data_respons?.[field.label];
                          if (!val) return <td key={field.label} className="py-3 px-3 text-slate-600 hidden lg:table-cell">-</td>;

                          if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:image'))) {
                            return (
                              <td key={field.label} className="py-3 px-3 hidden lg:table-cell">
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 hover:text-white border border-blue-500/30 text-[10px]"
                                >
                                  📎 File
                                </a>
                              </td>
                            );
                          }

                          return (
                            <td key={field.label} className="py-3 px-3 text-slate-300 max-w-[180px] truncate hidden lg:table-cell" title={String(val)}>
                              {String(val)}
                            </td>
                          );
                        })}

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailTarget(row)}
                              title="Lihat Detail Respon Lengkap"
                              className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 transition-all"
                            >
                              🔍
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  absensiId: row.absensiId,
                                  nama: row.nama,
                                  nrp: row.nrp,
                                  submissionNo: row.submission_no,
                                  subIndex: row.sub_index,
                                  isSubEntry: row.is_sub_entry,
                                })
                              }
                              title="Hapus Tanggapan Ini"
                              className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 transition-all"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: AUDIT PARTISIPASI ANGKATAN (CEK STATUS SEMUA NRP ANGKATAN - DIALIHFUNGSIKAN) ── */}
      {mainTab === 'audit' && (
        <div className="space-y-4 slide-up">
          {/* Header Card with Quick Copy Tools */}
          <div className="glass-card rounded-2xl p-5 border border-indigo-500/30 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">👥</span>
                <div>
                  <h3 className="text-white font-bold text-base">Audit Partisipasi Angkatan IT 2026</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Memantau kelengkapan seluruh {totalAnggota} mahasiswa. Gunakan untuk pengecekan cepat, verifikasi siapa saja yang belum mengisi, dan sweeping angkatan.
                  </p>
                </div>
              </div>

              {/* Action Buttons for Sweeping */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyUnfilledNrp('plain')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span>📋</span> Salin NRP Belum Mengisi ({countBelumMengisi})
                </button>
                <button
                  type="button"
                  onClick={() => copyUnfilledNrp('broadcast')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
                >
                  <span>💬</span> Salin Format Broadcast WA/Line
                </button>
              </div>
            </div>

            {copiedAuditToast && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold fade-in">
                {copiedAuditToast}
              </div>
            )}
          </div>

          {/* Filter Bar for Audit List */}
          <div className="glass-card rounded-2xl p-4 border border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setAuditFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  auditFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Semua ({totalAnggota})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter('belum')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  auditFilter === 'belum'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ❌ Belum Mengisi ({countBelumMengisi})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter('sudah')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  auditFilter === 'sudah'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ✓ Sudah Mengisi ({countMahasiswaMengisi})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                placeholder="Cari nama / NRP..."
                className="w-full sm:w-56 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
              />
              <select
                value={auditProdi}
                onChange={(e) => setAuditProdi(e.target.value)}
                className="bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
              >
                <option value="all">Semua Prodi</option>
                {prodiOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Audit Master Table */}
          <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-3">NRP</th>
                    <th className="py-3 px-4">Nama Mahasiswa</th>
                    <th className="py-3 px-3 hidden md:table-cell">Prodi</th>
                    <th className="py-3 px-3 text-center">Status Form</th>
                    <th className="py-3 px-3 text-center">Jumlah Respon</th>
                    {isQrEnabled && <th className="py-3 px-3 text-center">Status QR</th>}
                    <th className="py-3 px-3">Waktu Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {processedAuditList.length === 0 ? (
                    <tr>
                      <td colSpan={isQrEnabled ? 8 : 7} className="text-center py-10 text-slate-500">
                        Tidak ada data mahasiswa dengan kriteria filter ini.
                      </td>
                    </tr>
                  ) : (
                    processedAuditList.map((row, idx) => (
                      <tr key={row.nrp} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-300">{row.nrp}</td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <div>{row.nama}</div>
                          <div className="text-[10px] text-slate-500 font-normal md:hidden">{row.program_studi}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-400 hidden md:table-cell">{row.program_studi}</td>
                        <td className="py-3 px-3 text-center">
                          {row.is_filled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                              ✓ Sudah
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-bold">
                              ❌ Belum
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          {row.submission_count > 0 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 font-bold">
                              {row.submission_count}x
                            </span>
                          ) : (
                            <span className="text-slate-600">0x</span>
                          )}
                        </td>
                        {isQrEnabled && (
                          <td className="py-3 px-3 text-center">
                            {row.is_qr_scanned ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                                ✓ Scan
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </td>
                        )}
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {row.latest_time ? (
                            new Date(row.latest_time).toLocaleString('id-ID', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: REKAP FEEDBACK & EVALUASI ACARA ── */}
      {isFeedbackEnabled && mainTab === 'feedback' && (
        <div className="space-y-5 slide-up">
          {/* Feedback Rating Header Card */}
          <div className="tech-card rounded-3xl p-6 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-amber-400">{avgRating}</span>
                <span className="text-[10px] text-amber-200/80">dari 5.0</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Kepuasan Peserta Acara</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Total <span className="text-amber-400 font-bold">{countFeedback}</span> anggota telah memberikan ulasan evaluasi.
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={`text-xl ${s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-slate-600'}`}>
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <div className="space-y-1.5 w-full sm:w-56 text-xs">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = feedbackList.filter((f) => Number(f.rating_overall) === star).length;
                  const pct = countFeedback > 0 ? (count / countFeedback) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-4 text-amber-400 font-bold">{star}★</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-slate-400 font-mono text-[10px]">{count}</span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={generateFeedbackPdfReport}
                disabled={exportingPdf || feedbackList.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
              >
                <span>📄</span>
                <span>{exportingPdf ? 'Exporting PDF...' : 'Download PDF Feedback'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Responses List */}
          <div className="glass-card rounded-2xl p-6 border border-slate-700/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <span>💬</span> Ulasan & Masukan Peserta ({feedbackList.length})
              </h4>
            </div>

            {feedbackList.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Belum ada anggota yang mengirimkan feedback untuk acara ini.
              </div>
            ) : (
              <div className="space-y-4">
                {feedbackList.map((fb, idx) => {
                  const anggotaInfo = anggotaMap[fb.nrp];
                  const overallNote = fb.data_respons?.['Ulasan Keseluruhan Acara'];

                  return (
                    <div key={fb.id || idx} className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/40 pb-3">
                        <div>
                          <p className="text-white font-bold text-sm">{anggotaInfo?.nama || fb.nrp}</p>
                          <p className="text-slate-400 text-[11px] font-mono">{fb.nrp} • {anggotaInfo?.program_studi}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">Kepuasan:</span>
                          <div className="flex items-center gap-1 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30 text-amber-300 font-bold text-xs">
                            ★ {fb.rating_overall ? `${fb.rating_overall} / 5` : '-'}
                          </div>
                        </div>
                      </div>

                      {overallNote && (
                        <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs">
                          <span className="text-blue-300 font-semibold block mb-0.5">💬 Kesan & Ulasan Keseluruhan:</span>
                          <p className="text-white italic">"{String(overallNote)}"</p>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        {feedbackSchema.map((field, i) => {
                          const val = fb.data_respons?.[field.label];
                          const note = fb.data_respons?.[`${field.label}__catatan`];

                          if (field.type === 'rating' || field.type === 'scale') {
                            return (
                              <div
                                key={i}
                                className="p-3 rounded-xl bg-slate-900/70 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="sm:w-1/3 min-w-[200px]">
                                  <span className="text-slate-300 font-semibold text-xs block mb-1.5">{field.label}</span>
                                  {field.type === 'rating' ? (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
                                      <span>★ {val !== undefined ? `${val} / 5` : '-'}</span>
                                      <span className="text-[10px] text-amber-400/70 font-normal">Bintang</span>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 font-mono font-bold text-xs">
                                      <span>📊 Skala {val !== undefined ? `${val} / 10` : '-'}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 bg-slate-800/70 p-2.5 rounded-lg border border-slate-700/50 text-xs">
                                  <span className="text-[10px] text-slate-400 font-medium block mb-0.5">Catatan:</span>
                                  {note ? (
                                    <p className="text-white italic">"{String(note)}"</p>
                                  ) : (
                                    <p className="text-slate-500 italic text-[11px]">— Tidak ada catatan</p>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          if (field.type === 'textarea' || field.type === 'text') {
                            return (
                              <div key={i} className="p-3 rounded-xl bg-slate-900/70 border border-slate-700/50 text-xs space-y-1">
                                <span className="text-slate-400 font-semibold block">{field.label}:</span>
                                <p className="text-slate-200 whitespace-pre-line bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
                                  {val ? String(val) : <span className="text-slate-500 italic">— Kosong</span>}
                                </p>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>

                      <div className="pt-2 text-[10px] text-slate-500 text-right">
                        Dikirim: {new Date(fb.created_at).toLocaleString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DETAIL RESPONS MODAL ── */}
      {mounted && detailTarget && (
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass rounded-3xl p-6 max-w-xl w-full border border-blue-500/30 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto slide-up">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Tanggapan #{detailTarget.submission_no}
                    </span>
                    <span className="text-slate-400 text-xs font-mono">
                      {new Date(detailTarget.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })} WIB
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{detailTarget.nama}</h3>
                  <p className="text-xs text-slate-400 font-mono">{detailTarget.nrp} • {detailTarget.program_studi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all text-xs"
                >
                  ✕ Tutup
                </button>
              </div>

              {/* Answers */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">Rincian Jawaban Formulir:</h4>
                {formFields.length === 0 ? (
                  <p className="text-xs text-slate-500">Tidak ada pertanyaan formulir.</p>
                ) : (
                  formFields.map((field, fIdx) => {
                    const ans = detailTarget.data_respons?.[field.label];
                    const isFile = typeof ans === 'string' && (ans.startsWith('http') || ans.startsWith('data:image'));

                    return (
                      <div key={fIdx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-slate-300 block">{field.label}:</span>
                        {ans ? (
                          isFile ? (
                            <div className="pt-1">
                              <a
                                href={ans}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-500"
                              >
                                📎 Buka / Unduh Lampiran File
                              </a>
                            </div>
                          ) : (
                            <p className="text-white text-xs whitespace-pre-wrap bg-slate-800/70 p-2.5 rounded-lg border border-slate-700/50">
                              {String(ans)}
                            </p>
                          )
                        ) : (
                          <span className="text-slate-600 text-xs italic">— Tidak dijawab / Kosong</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 text-right">
                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="btn-primary h-10 px-5 text-xs font-bold"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* ── CONFIRM DELETE MODAL ── */}
      {mounted && deleteTarget && (
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass rounded-2xl p-6 max-w-sm w-full border border-red-500/30 shadow-2xl text-center slide-up">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-2xl mx-auto mb-3">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Hapus Data Respon?</h3>
              <p className="text-slate-400 text-xs mb-4">
                Tanggapan {deleteTarget.submissionNo ? `ke-${deleteTarget.submissionNo}` : ''} milik <strong className="text-white">{deleteTarget.nama}</strong> ({deleteTarget.nrp}) akan dihapus dari sistem.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSubmission}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >
                  {deleting ? 'Menghapus...' : 'Ya, Hapus Respon'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
}
