'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Event, Anggota, Absensi, Feedback, FormField } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  event: Event;
  allAnggota: Anggota[];
  absensiList: Absensi[];
  feedbackList?: Feedback[];
}

type MainViewTab = 'kehadiran' | 'feedback' | 'sweeping';
type CombinedStatusFilter = 'all' | 'lengkap' | 'sebagian' | 'mangkir';
type StatusBinaryFilter = 'all' | 'yes' | 'no';
type SortOrder = 'asc' | 'desc';

interface DeleteTarget {
  absensiId: string;
  nama: string;
  nrp: string;
}

export default function AbsensiReportClient({
  event,
  allAnggota,
  absensiList: initialAbsensiList,
  feedbackList: initialFeedbackList = [],
}: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [mainTab, setMainTab] = useState<MainViewTab>('kehadiran');

  // Multi-Filter states
  const [combinedStatus, setCombinedStatus] = useState<CombinedStatusFilter>('all');
  const [filterForm,     setFilterForm]     = useState<StatusBinaryFilter>('all');
  const [filterQr,       setFilterQr]       = useState<StatusBinaryFilter>('all');
  const [selectedProdi,  setSelectedProdi]  = useState<string>('all');
  const [selectedRespField, setSelectedRespField] = useState<string>('all');
  const [selectedRespVal,   setSelectedRespVal]   = useState<string>('all');
  const [search,         setSearch]         = useState('');

  // Sorting & Data states
  const [sortKey,        setSortKey]        = useState<string>('nrp');
  const [sortOrder,      setSortOrder]      = useState<SortOrder>('asc');
  const [absensiList,    setAbsensiList]    = useState<Absensi[]>(initialAbsensiList);
  const [feedbackList,   setFeedbackList]   = useState<Feedback[]>(initialFeedbackList);
  const [deleteTarget,   setDeleteTarget]   = useState<DeleteTarget | null>(null);
  const [deleting,       setDeleting]       = useState(false);
  const [exportingPdf,   setExportingPdf]   = useState(false);
  const [mounted,        setMounted]        = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setAbsensiList(initialAbsensiList); }, [initialAbsensiList]);
  useEffect(() => { setFeedbackList(initialFeedbackList); }, [initialFeedbackList]);

  const formFields: FormField[] = (event.form_schema ?? []).filter((f) => f.type !== 'info');
  const feedbackSchema: FormField[] = (event.feedback_schema ?? []).filter((f) => f.type !== 'info');

  // List of unique Program Studi for dropdown
  const prodiOptions = useMemo(() => {
    const set = new Set<string>();
    allAnggota.forEach((a) => { if (a.program_studi) set.add(a.program_studi); });
    return Array.from(set).sort();
  }, [allAnggota]);

  // Lookup maps
  const absensiMap = useMemo(() => {
    const map: Record<string, Absensi> = {};
    absensiList.forEach((a) => { map[a.nrp] = a; });
    return map;
  }, [absensiList]);

  const feedbackMap = useMemo(() => {
    const map: Record<string, Feedback> = {};
    feedbackList.forEach((f) => { map[f.nrp] = f; });
    return map;
  }, [feedbackList]);

  // Merged master list
  const merged = useMemo(() =>
    allAnggota.map((a) => {
      const abs = absensiMap[a.nrp] ?? null;
      const fb  = feedbackMap[a.nrp] ?? null;
      const isFormFilled = !!(abs?.is_form_filled || (abs?.data_respons && Object.keys(abs.data_respons).length > 0));
      const isQrScanned  = !!abs?.is_qr_scanned;
      const isHadirLengkap = isFormFilled && isQrScanned;
      const isHadirSebagian = (isFormFilled || isQrScanned) && !isHadirLengkap;
      const isMangkir = !isFormFilled && !isQrScanned;

      return {
        ...a,
        is_form_filled: isFormFilled,
        is_qr_scanned:  isQrScanned,
        hadir:          isFormFilled || isQrScanned,
        is_hadir_lengkap: isHadirLengkap,
        is_hadir_sebagian: isHadirSebagian,
        is_mangkir:     isMangkir,
        has_feedback:   !!fb,
        absensi:        abs,
        feedback:       fb,
      };
    }),
    [allAnggota, absensiMap, feedbackMap]
  );

  // KPI Counts
  const totalAnggota     = merged.length;
  const countFormFilled  = merged.filter((a) => a.is_form_filled).length;
  const countQrScanned   = merged.filter((a) => a.is_qr_scanned).length;
  const countLengkap     = merged.filter((a) => a.is_hadir_lengkap).length;
  const countSebagian    = merged.filter((a) => a.is_hadir_sebagian).length;
  const countMangkir     = merged.filter((a) => a.is_mangkir).length;
  const countFeedback    = feedbackList.length;

  // Average feedback rating
  const avgRating = useMemo(() => {
    const validRatings = feedbackList
      .map((f) => Number(f.rating_overall))
      .filter((r) => !isNaN(r) && r > 0);
    if (validRatings.length === 0) return 0;
    const sum = validRatings.reduce((a, b) => a + b, 0);
    return (sum / validRatings.length).toFixed(1);
  }, [feedbackList]);

  // Dropdown response filter options
  const dynamicResponseFieldOptions = useMemo(() => {
    return formFields.filter((f) => f.options && f.options.length > 0);
  }, [formFields]);

  const dynamicResponseValues = useMemo(() => {
    if (selectedRespField === 'all') return [];
    const field = formFields.find((f) => f.label === selectedRespField);
    return field?.options || [];
  }, [formFields, selectedRespField]);

  // Reset all filters helper
  const resetFilters = () => {
    setCombinedStatus('all');
    setFilterForm('all');
    setFilterQr('all');
    setSelectedProdi('all');
    setSelectedRespField('all');
    setSelectedRespVal('all');
    setSearch('');
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Delete attendance record
  const confirmDeleteAbsensi = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from('absensi')
      .delete()
      .eq('id', deleteTarget.absensiId);

    if (error) {
      alert('Gagal menghapus data absensi: ' + error.message);
    } else {
      setAbsensiList((prev) => prev.filter((a) => a.id !== deleteTarget.absensiId));
      router.refresh();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  // Filter & Sort processed list
  const processedList = useMemo(() => {
    let list = merged;

    // Combined KPI status filter
    if (combinedStatus === 'lengkap')  list = list.filter((a) => a.is_hadir_lengkap);
    if (combinedStatus === 'sebagian') list = list.filter((a) => a.is_hadir_sebagian);
    if (combinedStatus === 'mangkir')  list = list.filter((a) => a.is_mangkir);

    // Form status binary filter
    if (filterForm === 'yes') list = list.filter((a) => a.is_form_filled);
    if (filterForm === 'no')  list = list.filter((a) => !a.is_form_filled);

    // QR status binary filter
    if (filterQr === 'yes') list = list.filter((a) => a.is_qr_scanned);
    if (filterQr === 'no')  list = list.filter((a) => !a.is_qr_scanned);

    // Prodi filter
    if (selectedProdi !== 'all') {
      list = list.filter((a) => a.program_studi === selectedProdi);
    }

    // Dynamic response question filter
    if (selectedRespField !== 'all' && selectedRespVal !== 'all') {
      list = list.filter((a) => {
        const val = String(a.absensi?.data_respons?.[selectedRespField] ?? '').trim().toLowerCase();
        return val === selectedRespVal.trim().toLowerCase();
      });
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.nrp.toLowerCase().includes(q) ||
          a.nama.toLowerCase().includes(q) ||
          a.program_studi.toLowerCase().includes(q)
      );
    }

    // Sorting
    const sorted = [...list].sort((a, b) => {
      let valA: string | number | boolean = '';
      let valB: string | number | boolean = '';

      if (sortKey === 'nrp') {
        valA = a.nrp; valB = b.nrp;
      } else if (sortKey === 'nama') {
        valA = a.nama; valB = b.nama;
      } else if (sortKey === 'program_studi') {
        valA = a.program_studi; valB = b.program_studi;
      } else if (sortKey === 'form_status') {
        valA = a.is_form_filled ? 1 : 0; valB = b.is_form_filled ? 1 : 0;
      } else if (sortKey === 'qr_status') {
        valA = a.is_qr_scanned ? 1 : 0; valB = b.is_qr_scanned ? 1 : 0;
      } else if (sortKey === 'waktu') {
        valA = a.absensi ? new Date(a.absensi.created_at).getTime() : 0;
        valB = b.absensi ? new Date(b.absensi.created_at).getTime() : 0;
      } else {
        valA = String(a.absensi?.data_respons?.[sortKey] ?? '');
        valB = String(b.absensi?.data_respons?.[sortKey] ?? '');
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

    return sorted;
  }, [merged, combinedStatus, filterForm, filterQr, selectedProdi, selectedRespField, selectedRespVal, search, sortKey, sortOrder]);

  // ── GENERATE PROFESSIONAL PDF EXPORT ────────────────────────
  const generatePdfReport = async (exportAll: boolean = false) => {
    setExportingPdf(true);

    try {
      const dataToExport = exportAll ? merged : processedList;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Title & Header Styling
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text(`LAPORAN KEHADIRAN & ABSENSI ACARA`, 14, 15);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text(`${event.nama_event.toUpperCase()}`, 14, 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // Slate-500
      const exportDate = new Date().toLocaleString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      doc.text(`Waktu Cetak: ${exportDate} WIB | Total Data: ${dataToExport.length} Anggota`, 14, 28);

      // KPI Summary Box in PDF
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.roundedRect(14, 32, 269, 14, 2, 2, 'F');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Total Anggota: ${totalAnggota}  |  Sudah Form: ${countFormFilled}  |  Sudah Scan QR: ${countQrScanned}  |  Hadir Lengkap: ${countLengkap}  |  Belum Hadir: ${countMangkir}`,
        18,
        41
      );

      // Dynamic table columns
      const headers = [
        'No',
        'NRP',
        'Nama Lengkap',
        'Program Studi',
        'Status Form',
        'Status QR',
        'Waktu Absen',
        ...formFields.slice(0, 3).map((f) => f.label),
      ];

      const tableRows = dataToExport.map((a, i) => [
        i + 1,
        a.nrp,
        a.nama,
        a.program_studi,
        a.is_form_filled ? 'Sudah Form' : 'Belum',
        a.is_qr_scanned ? 'Sudah Scan' : 'Belum',
        a.absensi?.qr_scanned_at
          ? new Date(a.absensi.qr_scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : (a.absensi?.created_at
              ? new Date(a.absensi.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              : '-'),
        ...formFields.slice(0, 3).map((f) => String(a.absensi?.data_respons?.[f.label] ?? '-')),
      ]);

      autoTable(doc, {
        startY: 50,
        head: [headers],
        body: tableRows,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [79, 70, 229], // Indigo-600
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 26, fontStyle: 'bold' },
          2: { cellWidth: 45 },
          3: { cellWidth: 38 },
          4: { cellWidth: 24, halign: 'center' },
          5: { cellWidth: 24, halign: 'center' },
          6: { cellWidth: 24, halign: 'center' },
        },
        didDrawPage: (data) => {
          // Footer page numbers
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Halaman ${data.pageNumber} — Sistem Absensi Digital IT '26`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 8,
            { align: 'center' }
          );
        },
      });

      const filename = `Laporan_Absensi_${event.nama_event.replace(/\s+/g, '_')}_${exportAll ? 'Semua' : 'Filtered'}.pdf`;
      doc.save(filename);
    } catch (err: any) {
      alert('Gagal membuat file PDF: ' + err?.message);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── GENERATE CSV EXPORT ─────────────────────────────────────
  const exportCsv = () => {
    const headers = [
      'No',
      'NRP',
      'Nama',
      'Program Studi',
      'Status Form',
      'Status Scan QR',
      'Hadir Total',
      'Waktu Form',
      'Waktu Scan QR',
      ...formFields.map((f) => `"${f.label.replace(/"/g, '""')}"`),
    ];

    const rows = processedList.map((a, i) => [
      i + 1,
      `"${a.nrp}"`,
      `"${a.nama}"`,
      `"${a.program_studi}"`,
      a.is_form_filled ? 'Sudah' : 'Belum',
      a.is_qr_scanned ? 'Sudah' : 'Belum',
      a.hadir ? 'Hadir' : 'Tidak Hadir',
      a.absensi?.created_at ? `"${new Date(a.absensi.created_at).toISOString()}"` : '""',
      a.absensi?.qr_scanned_at ? `"${new Date(a.absensi.qr_scanned_at).toISOString()}"` : '""',
      ...formFields.map((f) => `"${String(a.absensi?.data_respons?.[f.label] ?? '').replace(/"/g, '""')}"`),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_${event.nama_event.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isFilterActive =
    combinedStatus !== 'all' ||
    filterForm !== 'all' ||
    filterQr !== 'all' ||
    selectedProdi !== 'all' ||
    selectedRespField !== 'all' ||
    search.trim() !== '';

  return (
    <div className="space-y-6">
      {/* ── 6 INTERACTIVE KPI METRIC CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 slide-up">
        {/* 1. Total Anggota */}
        <button
          type="button"
          onClick={resetFilters}
          className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 ${
            !isFilterActive
              ? 'bg-indigo-600/25 border-indigo-500 shadow-lg glow-indigo'
              : 'glass-card border-slate-700/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>👥 Semua</span>
            <span className="text-[10px]">100%</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{totalAnggota}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total Terdaftar</p>
        </button>

        {/* 2. Sudah Form */}
        <button
          type="button"
          onClick={() => { resetFilters(); setFilterForm('yes'); }}
          className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 ${
            filterForm === 'yes' && combinedStatus === 'all'
              ? 'bg-emerald-600/25 border-emerald-500 shadow-lg glow-indigo'
              : 'glass-card border-slate-700/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>📝 Sudah Form</span>
            <span className="text-[10px]">{Math.round((countFormFilled / totalAnggota) * 100)}%</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-300">{countFormFilled}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Isi Form Absen</p>
        </button>

        {/* 3. Sudah Scan QR */}
        <button
          type="button"
          onClick={() => { resetFilters(); setFilterQr('yes'); }}
          className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 ${
            filterQr === 'yes' && combinedStatus === 'all'
              ? 'bg-cyan-600/25 border-cyan-500 shadow-lg glow-indigo'
              : 'glass-card border-slate-700/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-cyan-400 mb-1">
            <span>📱 Sudah QR</span>
            <span className="text-[10px]">{Math.round((countQrScanned / totalAnggota) * 100)}%</span>
          </div>
          <p className="text-2xl font-extrabold text-cyan-300">{countQrScanned}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Check-in Lokasi</p>
        </button>

        {/* 4. Hadir Lengkap */}
        <button
          type="button"
          onClick={() => { resetFilters(); setCombinedStatus('lengkap'); }}
          className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 ${
            combinedStatus === 'lengkap'
              ? 'bg-green-600/25 border-green-500 shadow-lg glow-indigo'
              : 'glass-card border-slate-700/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-green-400 mb-1">
            <span>🌟 Lengkap</span>
            <span className="text-[10px]">{Math.round((countLengkap / totalAnggota) * 100)}%</span>
          </div>
          <p className="text-2xl font-extrabold text-green-300">{countLengkap}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Form + Scan QR</p>
        </button>

        {/* 5. Hadir Sebagian */}
        <button
          type="button"
          onClick={() => { resetFilters(); setCombinedStatus('sebagian'); }}
          className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 ${
            combinedStatus === 'sebagian'
              ? 'bg-amber-600/25 border-amber-500 shadow-lg glow-indigo'
              : 'glass-card border-slate-700/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
            <span>⚠️ Sebagian</span>
            <span className="text-[10px]">{Math.round((countSebagian / totalAnggota) * 100)}%</span>
          </div>
          <p className="text-2xl font-extrabold text-amber-300">{countSebagian}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Hanya 1 Status</p>
        </button>

        {/* 6. Belum Hadir / Mangkir */}
        <button
          type="button"
          onClick={() => { resetFilters(); setCombinedStatus('mangkir'); }}
          className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 ${
            combinedStatus === 'mangkir'
              ? 'bg-red-600/25 border-red-500 shadow-lg glow-indigo'
              : 'glass-card border-slate-700/50 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400 mb-1">
            <span>❌ Mangkir</span>
            <span className="text-[10px]">{Math.round((countMangkir / totalAnggota) * 100)}%</span>
          </div>
          <p className="text-2xl font-extrabold text-red-300">{countMangkir}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Belum Ada Aksi</p>
        </button>
      </div>

      {/* ── TOP MAIN NAVIGATION TABS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/50 slide-up">
        <div className="flex gap-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMainTab('kehadiran')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              mainTab === 'kehadiran'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg glow-indigo'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📊</span> Data Kehadiran ({processedList.length})
          </button>
          <button
            type="button"
            onClick={() => setMainTab('sweeping')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              mainTab === 'sweeping'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🎯</span> Mode Sweeping ({countMangkir + countSebagian})
          </button>
          <button
            type="button"
            onClick={() => setMainTab('feedback')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              mainTab === 'feedback'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg glow-purple'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⭐</span> Rekap Feedback ({countFeedback})
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => generatePdfReport(false)}
            disabled={exportingPdf}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>📄</span> {exportingPdf ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            type="button"
            onClick={() => generatePdfReport(true)}
            disabled={exportingPdf}
            title="Download PDF mencakup seluruh 140 anggota"
            className="hidden sm:inline-flex px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all shadow"
          >
            PDF Semua Data
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow flex items-center justify-center gap-1.5"
          >
            <span>📊</span> CSV
          </button>
        </div>
      </div>

      {/* ── VIEW 1: DATA KEHADIRAN & MULTI-FILTER MATRIX ── */}
      {mainTab === 'kehadiran' && (
        <div className="space-y-4 slide-up">
          {/* Multi-Filter Matrix Bar */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🔍</span> Filter Data Lengkap
              </span>
              {isFilterActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  ↺ Reset Semua Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Search */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Cari Nama / NRP:</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ketik nama / NRP..."
                  className="input-glow w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              {/* Status Form */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Status Pengisian Form:</label>
                <select
                  value={filterForm}
                  onChange={(e) => setFilterForm(e.target.value as StatusBinaryFilter)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">Semua Status Form</option>
                  <option value="yes">✓ Sudah Isi Form ({countFormFilled})</option>
                  <option value="no">❌ Belum Isi Form ({totalAnggota - countFormFilled})</option>
                </select>
              </div>

              {/* Status QR */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Status Scan QR Lokasi:</label>
                <select
                  value={filterQr}
                  onChange={(e) => setFilterQr(e.target.value as StatusBinaryFilter)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">Semua Status QR</option>
                  <option value="yes">✓ Sudah Scan QR ({countQrScanned})</option>
                  <option value="no">❌ Belum Scan QR ({totalAnggota - countQrScanned})</option>
                </select>
              </div>

              {/* Program Studi */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Program Studi:</label>
                <select
                  value={selectedProdi}
                  onChange={(e) => setSelectedProdi(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">Semua Program Studi</option>
                  {prodiOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Question & Response Filter (e.g. Pembayaran: Lunas vs Belum) */}
            {dynamicResponseFieldOptions.length > 0 && (
              <div className="pt-2 border-t border-slate-700/40 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Filter Jawaban Pertanyaan Form:</label>
                  <select
                    value={selectedRespField}
                    onChange={(e) => {
                      setSelectedRespField(e.target.value);
                      setSelectedRespVal('all');
                    }}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="all">— Pilih Pertanyaan Form (Opsi) —</option>
                    {dynamicResponseFieldOptions.map((f) => (
                      <option key={f.label} value={f.label}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {selectedRespField !== 'all' && (
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Pilih Nilai Jawaban:</label>
                    <select
                      value={selectedRespVal}
                      onChange={(e) => setSelectedRespVal(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="all">Semua Jawaban</option>
                      {dynamicResponseValues.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-700/80 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3 w-10 text-center">No</th>
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
                      Nama Lengkap {sortKey === 'nama' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-white transition-colors hidden md:table-cell"
                      onClick={() => handleSort('program_studi')}
                    >
                      Program Studi {sortKey === 'program_studi' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('form_status')}
                    >
                      Status Form {sortKey === 'form_status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('qr_status')}
                    >
                      Status QR {sortKey === 'qr_status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-white transition-colors hidden lg:table-cell"
                      onClick={() => handleSort('waktu')}
                    >
                      Waktu {sortKey === 'waktu' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>

                    {/* Dynamic Question Columns */}
                    {formFields.map((field) => (
                      <th
                        key={field.label}
                        className="py-3 px-3 cursor-pointer hover:text-white transition-colors hidden xl:table-cell"
                        onClick={() => handleSort(field.label)}
                      >
                        {field.label} {sortKey === field.label && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}

                    <th className="py-3 px-3 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {processedList.length === 0 ? (
                    <tr>
                      <td colSpan={7 + formFields.length} className="text-center py-10 text-slate-500">
                        Tidak ada data anggota yang cocok dengan filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    processedList.map((row, idx) => (
                      <tr key={row.nrp} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-300">{row.nrp}</td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <div>{row.nama}</div>
                          <div className="text-[10px] text-slate-500 font-normal md:hidden">{row.program_studi}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-400 hidden md:table-cell">{row.program_studi}</td>

                        {/* Status Form */}
                        <td className="py-3 px-3 text-center">
                          {row.is_form_filled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                              ✓ Sudah
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-500 text-[10px]">
                              Belum
                            </span>
                          )}
                        </td>

                        {/* Status Scan QR */}
                        <td className="py-3 px-3 text-center">
                          {row.is_qr_scanned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                              ✓ Scan QR
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-500 text-[10px]">
                              Belum
                            </span>
                          )}
                        </td>

                        {/* Waktu */}
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px] hidden lg:table-cell">
                          {row.absensi?.qr_scanned_at ? (
                            <span title="Waktu Scan QR">
                              {new Date(row.absensi.qr_scanned_at).toLocaleString('id-ID', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          ) : row.absensi?.created_at ? (
                            <span title="Waktu Isi Form">
                              {new Date(row.absensi.created_at).toLocaleString('id-ID', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        {/* Dynamic Answers */}
                        {formFields.map((field) => {
                          const val = row.absensi?.data_respons?.[field.label];
                          if (!val) return <td key={field.label} className="py-3 px-3 text-slate-600 hidden xl:table-cell">-</td>;

                          if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:image'))) {
                            return (
                              <td key={field.label} className="py-3 px-3 hidden xl:table-cell">
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px]"
                                >
                                  📎 File
                                </a>
                              </td>
                            );
                          }

                          return (
                            <td key={field.label} className="py-3 px-3 text-slate-300 max-w-xs truncate hidden xl:table-cell">
                              {String(val)}
                            </td>
                          );
                        })}

                        {/* Action Delete */}
                        <td className="py-3 px-3 text-center">
                          {row.absensi ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ absensiId: row.absensi!.id, nama: row.nama, nrp: row.nrp })}
                              title="Hapus data absensi ini agar anggota bisa mengisi ulang"
                              className="w-7 h-7 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 border border-red-500/30 flex items-center justify-center transition-all mx-auto"
                            >
                              🗑️
                            </button>
                          ) : (
                            <span className="text-slate-700">-</span>
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

      {/* ── VIEW 2: MODE SWEEPING PANITIA (DAFTAR CEPAT BELUM HADIR) ── */}
      {mainTab === 'sweeping' && (
        <div className="space-y-4 slide-up">
          <div className="glass-card rounded-2xl p-5 border border-amber-500/30">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="text-white font-bold text-base">Mode Sweeping Panitia Acara</h3>
                <p className="text-slate-400 text-xs">
                  Daftar seluruh anggota yang belum melakukan check-in scan QR di lokasi atau belum mengisi form.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Belum Scan QR di Lokasi */}
            <div className="glass-card rounded-2xl p-5 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <h4 className="font-bold text-cyan-300 text-sm flex items-center gap-1.5">
                  <span>📱</span> Belum Scan QR Lokasi ({totalAnggota - countQrScanned})
                </h4>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {merged.filter((a) => !a.is_qr_scanned).map((a, i) => (
                  <div key={a.nrp} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-white font-semibold">{i + 1}. {a.nama}</p>
                      <p className="text-slate-400 font-mono text-[10px]">{a.nrp} • {a.program_studi}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${a.is_form_filled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                      {a.is_form_filled ? 'Form OK' : 'Form Belum'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Mangkir / Belum Ada Aktivitas Sama Sekali */}
            <div className="glass-card rounded-2xl p-5 border border-red-500/20 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <h4 className="font-bold text-red-400 text-sm flex items-center gap-1.5">
                  <span>❌</span> Mangkir / Belum Ada Aksi ({countMangkir})
                </h4>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {merged.filter((a) => a.is_mangkir).map((a, i) => (
                  <div key={a.nrp} className="p-2.5 rounded-xl bg-slate-800/60 border border-red-500/20 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-white font-semibold">{i + 1}. {a.nama}</p>
                      <p className="text-slate-400 font-mono text-[10px]">{a.nrp} • {a.program_studi}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
                      Belum Hadir
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 3: REKAP FEEDBACK & EVALUASI ACARA ── */}
      {mainTab === 'feedback' && (
        <div className="space-y-5 slide-up">
          {/* Feedback Rating Header Card */}
          <div className="glass-card rounded-3xl p-6 border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex flex-col items-center justify-center glow-purple">
                <span className="text-3xl font-extrabold text-amber-400">{avgRating}</span>
                <span className="text-[10px] text-purple-200">dari 5.0</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Kepuasan Peserta Acara</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Total <span className="text-purple-300 font-bold">{countFeedback}</span> dari {totalAnggota} anggota telah memberikan ulasan evaluasi.
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

            {/* Rating distribution breakdown */}
            <div className="space-y-1.5 w-full md:w-64 text-xs">
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
          </div>

          {/* Feedback Responses List / Table */}
          <div className="glass-card rounded-2xl p-6 border border-slate-700/50 space-y-4">
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              <span>💬</span> Ulasan & Masukan Peserta ({feedbackList.length})
            </h4>

            {feedbackList.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Belum ada anggota yang mengirimkan feedback untuk event ini.
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackList.map((fb, idx) => {
                  const anggotaInfo = allAnggota.find((a) => a.nrp === fb.nrp);
                  return (
                    <div key={fb.id || idx} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-bold text-sm">{anggotaInfo?.nama || fb.nrp}</p>
                          <p className="text-slate-400 text-[11px] font-mono">{fb.nrp} • {anggotaInfo?.program_studi}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                          <span className="text-amber-400 text-sm font-bold">★ {fb.rating_overall || 5}</span>
                        </div>
                      </div>

                      {/* Custom feedback question answers */}
                      {fb.data_respons && Object.keys(fb.data_respons).length > 0 && (
                        <div className="pt-2 border-t border-slate-700/30 space-y-1.5">
                          {Object.entries(fb.data_respons).map(([q, ans], i) => (
                            <div key={i} className="text-xs">
                              <span className="text-slate-400 font-medium">{q}:</span>{' '}
                              <span className="text-slate-200">{String(ans)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-[10px] text-slate-500 text-right">
                        {new Date(fb.created_at).toLocaleString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE MODAL ── */}
      {mounted && deleteTarget && (
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass rounded-2xl p-6 max-w-sm w-full border border-red-500/30 shadow-2xl text-center slide-up">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-2xl mx-auto mb-3">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Hapus Data Absensi?</h3>
              <p className="text-slate-400 text-xs mb-4">
                Data absensi milik <strong className="text-white">{deleteTarget.nama}</strong> ({deleteTarget.nrp}) akan dihapus agar anggota dapat mengisi form kembali.
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
                  onClick={confirmDeleteAbsensi}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >
                  {deleting ? 'Menghapus...' : 'Ya, Hapus Data'}
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
