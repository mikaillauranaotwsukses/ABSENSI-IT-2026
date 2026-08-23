'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Event, Anggota, Absensi, FormField } from '@/lib/types';
import Link from 'next/link';

interface Props {
  event: Event;
  allAnggota: Anggota[];
  absensiList: Absensi[];
}

type Tab = 'semua' | 'form' | 'qr' | 'belum';
type SortOrder = 'asc' | 'desc';

interface DeleteTarget {
  absensiId: string;
  nama: string;
  nrp: string;
}

export default function AbsensiReportClient({ event, allAnggota, absensiList: initialAbsensiList }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [tab,            setTab]            = useState<Tab>('semua');
  const [search,         setSearch]         = useState('');
  const [sortKey,        setSortKey]        = useState<string>('nrp');
  const [sortOrder,      setSortOrder]      = useState<SortOrder>('asc');
  const [absensiList,    setAbsensiList]    = useState<Absensi[]>(initialAbsensiList);
  const [deleteTarget,   setDeleteTarget]   = useState<DeleteTarget | null>(null);
  const [deleting,       setDeleting]       = useState(false);
  const [mounted,        setMounted]        = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setAbsensiList(initialAbsensiList);
  }, [initialAbsensiList]);

  const formFields: FormField[] = (event.form_schema ?? []).filter(
    (f) => f.type !== 'info'
  );

  // Lookup nrp -> absensi
  const absensiMap = useMemo(() => {
    const map: Record<string, Absensi> = {};
    absensiList.forEach((a) => { map[a.nrp] = a; });
    return map;
  }, [absensiList]);

  // Merged list with dual status
  const merged = useMemo(() =>
    allAnggota.map((a) => {
      const abs = absensiMap[a.nrp] ?? null;
      const isFormFilled = !!(abs?.is_form_filled || (abs?.data_respons && Object.keys(abs.data_respons).length > 0));
      const isQrScanned = !!abs?.is_qr_scanned;

      return {
        ...a,
        is_form_filled: isFormFilled,
        is_qr_scanned:  isQrScanned,
        hadir:          isFormFilled || isQrScanned,
        absensi:        abs,
      };
    }),
    [allAnggota, absensiMap]
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

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

  // Filter & Sort
  const processedList = useMemo(() => {
    let list = merged;

    if (tab === 'form')  list = list.filter((a) => a.is_form_filled);
    if (tab === 'qr')    list = list.filter((a) => a.is_qr_scanned);
    if (tab === 'belum') list = list.filter((a) => !a.hadir);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.nrp.toLowerCase().includes(q) ||
          a.nama.toLowerCase().includes(q) ||
          a.program_studi.toLowerCase().includes(q)
      );
    }

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
  }, [merged, tab, search, sortKey, sortOrder]);

  const countFormFilled = merged.filter((a) => a.is_form_filled).length;
  const countQrScanned  = merged.filter((a) => a.is_qr_scanned).length;
  const countBelum      = merged.filter((a) => !a.hadir).length;

  const exportCsv = () => {
    const headers = [
      'No', 'NRP', 'Nama', 'Program Studi', 'Status Form', 'Status Scan QR',
      ...formFields.map((f) => f.label),
      'Waktu Absen',
    ];
    const rows = processedList.map((a, idx) => [
      idx + 1,
      a.nrp,
      a.nama,
      a.program_studi,
      a.is_form_filled ? 'Sudah Mengisi Form' : 'Belum',
      a.is_qr_scanned  ? 'Sudah Scan QR' : 'Belum',
      ...formFields.map((f) => a.absensi?.data_respons?.[f.label] ?? ''),
      a.absensi ? new Date(a.absensi.created_at).toLocaleString('id-ID') : '',
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `absensi_${event.nama_event.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) return <span className="text-slate-600 ml-1 font-normal opacity-0 group-hover:opacity-100 transition-opacity">↕</span>;
    return <span className="text-indigo-400 ml-1 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden slide-up">
      {/* Toolbar */}
      <div className="p-5 border-b border-slate-700/50 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-800/60 rounded-xl w-fit text-xs sm:text-sm">
            {([
              ['semua', `Semua (${merged.length})`,  'text-slate-300'],
              ['form',  `📝 Sudah Form (${countFormFilled})`, 'text-green-400'],
              ['qr',    `📱 Sudah Scan QR (${countQrScanned})`, 'text-cyan-400'],
              ['belum', `Belum Absen (${countBelum})`, 'text-red-400'],
            ] as [Tab, string, string][]).map(([t, label, activeColor]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  tab === t ? `bg-slate-700 ${activeColor} shadow` : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Quick Scanner Button */}
          <Link
            href="/portal-it-admin/scan"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all glow-indigo shadow-md"
          >
            📷 Buka Scanner QR Panitia
          </Link>
        </div>

        {/* Search + Sort + Export */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari NRP, nama, atau prodi..."
              className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortKey}
              onChange={(e) => handleSort(e.target.value)}
              className="bg-slate-800/80 border border-slate-600/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="nrp">NRP</option>
              <option value="nama">Nama</option>
              <option value="program_studi">Program Studi</option>
              <option value="form_status">Status Form</option>
              <option value="qr_status">Status QR</option>
              <option value="waktu">Waktu Absen</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2.5 py-2 rounded-xl bg-slate-800/80 border border-slate-600/50 text-indigo-300 text-xs hover:bg-slate-700 transition-colors"
            >
              {sortOrder === 'asc' ? '▲ (A-Z)' : '▼ (Z-A)'}
            </button>
          </div>

          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-medium transition-all whitespace-nowrap"
          >
            📊 Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/30">
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-10">No</th>
              <th onClick={() => handleSort('nrp')} className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white group select-none">
                NRP {renderSortIcon('nrp')}
              </th>
              <th onClick={() => handleSort('nama')} className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white group select-none">
                Nama {renderSortIcon('nama')}
              </th>
              <th onClick={() => handleSort('program_studi')} className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-white group select-none">
                Program Studi {renderSortIcon('program_studi')}
              </th>

              {/* DUAL STATUS COLUMNS */}
              <th onClick={() => handleSort('form_status')} className="text-center px-3 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white group select-none">
                📝 Status Form {renderSortIcon('form_status')}
              </th>
              <th onClick={() => handleSort('qr_status')} className="text-center px-3 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white group select-none">
                📱 Status Scan QR {renderSortIcon('qr_status')}
              </th>

              {formFields.map((f, i) => (
                <th key={i} onClick={() => handleSort(f.label)} className="text-left px-4 py-3.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-indigo-300 group select-none">
                  {f.label} {renderSortIcon(f.label)}
                </th>
              ))}
              <th onClick={() => handleSort('waktu')} className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap cursor-pointer hover:text-white group select-none">
                Waktu {renderSortIcon('waktu')}
              </th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {processedList.map((row, idx) => (
              <tr key={row.nrp} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-indigo-300">{row.nrp}</td>
                <td className="px-4 py-3 text-slate-200 font-medium">{row.nama}</td>
                <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{row.program_studi}</td>

                {/* Status Form Badge */}
                <td className="px-3 py-3 text-center">
                  {row.is_form_filled ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 text-[11px] font-semibold">
                      ✓ Sudah Form
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 text-[11px]">
                      Belum
                    </span>
                  )}
                </td>

                {/* Status QR Scan Badge */}
                <td className="px-3 py-3 text-center">
                  {row.is_qr_scanned ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold">
                      ✓ Sudah Scan QR
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 text-[11px]">
                      Belum
                    </span>
                  )}
                </td>

                {formFields.map((f, i) => {
                  const val = row.absensi?.data_respons?.[f.label];
                  return (
                    <td key={i} className="px-4 py-3 text-slate-300 max-w-[200px]">
                      {val ? (
                        typeof val === 'string' && val.startsWith('http') ? (
                          <a href={val} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs transition-colors">
                            🔗 Lihat File
                          </a>
                        ) : (
                          <span className="truncate block">{String(val)}</span>
                        )
                      ) : (
                        <span className="text-slate-600 italic">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell whitespace-nowrap">
                  {row.absensi
                    ? new Date(row.absensi.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })
                    : <span className="text-slate-700">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  {row.hadir && row.absensi ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ absensiId: row.absensi!.id, nama: row.nama, nrp: row.nrp })}
                      title="Hapus data absensi anggota ini"
                      className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/25 border border-red-500/25 text-red-400 hover:text-red-300 text-xs transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-slate-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Modal */}
      {deleteTarget && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md scale-in z-10 border border-red-500/20 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center text-xl shrink-0">🗑️</div>
              <div>
                <h3 className="font-bold text-white">Hapus Data Absensi</h3>
                <p className="text-slate-400 text-sm">{deleteTarget.nama} ({deleteTarget.nrp})</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 mb-6 text-sm text-slate-300 leading-relaxed">
              Tindakan ini akan menghapus data kehadiran anggota ini dari laporan. Anggota dapat mengisi form atau scan QR ulang.
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 py-2.5 rounded-xl border border-slate-600/50 text-slate-300 hover:text-white text-sm font-medium transition-all">
                Batal
              </button>
              <button type="button" onClick={confirmDeleteAbsensi} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">
                {deleting ? 'Menghapus...' : 'Ya, Hapus Absen'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
