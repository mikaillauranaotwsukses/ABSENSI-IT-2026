'use client';

import { useState, useMemo } from 'react';
import { Event, Anggota, Absensi, FormField } from '@/lib/types';

interface Props {
  event: Event;
  allAnggota: Anggota[];
  absensiList: Absensi[];
}

type Tab = 'semua' | 'hadir' | 'belum';

export default function AbsensiReportClient({ event, allAnggota, absensiList }: Props) {
  const [tab,    setTab]    = useState<Tab>('semua');
  const [search, setSearch] = useState('');

  const formFields: FormField[] = (event.form_schema ?? []).filter(
    (f) => f.type !== 'info'   // Info blocks have no data in responses
  );

  // Build a fast lookup: nrp -> absensi record
  const absensiMap = useMemo(() => {
    const map: Record<string, Absensi> = {};
    absensiList.forEach((a) => { map[a.nrp] = a; });
    return map;
  }, [absensiList]);

  // Merged list with status
  const merged = useMemo(() =>
    allAnggota.map((a) => ({
      ...a,
      hadir:    !!absensiMap[a.nrp],
      absensi:  absensiMap[a.nrp] ?? null,
    })),
    [allAnggota, absensiMap]
  );

  // Filter by tab then by search
  const filtered = useMemo(() => {
    let list = merged;
    if (tab === 'hadir')  list = list.filter((a) =>  a.hadir);
    if (tab === 'belum')  list = list.filter((a) => !a.hadir);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.nrp.toLowerCase().includes(q) ||
          a.nama.toLowerCase().includes(q) ||
          a.program_studi.toLowerCase().includes(q)
      );
    }
    return list;
  }, [merged, tab, search]);

  const hadirCount = merged.filter((a) => a.hadir).length;
  const belumCount = merged.filter((a) => !a.hadir).length;

  // ── CSV Export ──────────────────────────────────────────────
  const exportCsv = () => {
    const headers = [
      'No', 'NRP', 'Nama', 'Program Studi', 'Status Hadir',
      ...formFields.map((f) => f.label),
      'Waktu Absen',
    ];
    const rows = merged.map((a, idx) => [
      idx + 1,
      a.nrp,
      a.nama,
      a.program_studi,
      a.hadir ? 'Hadir' : 'Belum Absen',
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

  return (
    <div className="glass-card rounded-2xl overflow-hidden slide-up">
      {/* Toolbar */}
      <div className="p-5 border-b border-slate-700/50 space-y-3">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl w-fit">
          {([
            ['semua', `Semua (${merged.length})`,  'text-slate-300'],
            ['hadir', `Hadir (${hadirCount})`,      'text-green-400'],
            ['belum', `Belum (${belumCount})`,      'text-red-400'],
          ] as [Tab, string, string][]).map(([t, label, activeColor]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? `bg-slate-700 ${activeColor} shadow`
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search + export */}
        <div className="flex flex-col sm:flex-row gap-3">
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
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-sm font-medium transition-all whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/30">
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-10">No</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">NRP</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nama</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Program Studi</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              {formFields.map((f, i) => (
                <th key={i} className="text-left px-4 py-3.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {filtered.map((row, idx) => (
              <tr
                key={row.nrp}
                className={`transition-colors ${
                  row.hadir
                    ? 'hover:bg-green-900/10'
                    : 'hover:bg-red-900/10 opacity-70'
                }`}
              >
                <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-indigo-300">{row.nrp}</td>
                <td className="px-4 py-3 text-slate-200 font-medium">{row.nama}</td>
                <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{row.program_studi}</td>
                <td className="px-4 py-3 text-center">
                  {row.hadir ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full badge-open text-xs font-medium">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Hadir
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full badge-closed text-xs font-medium">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Belum
                    </span>
                  )}
                </td>
                {formFields.map((f, i) => {
                  const val = row.absensi?.data_respons?.[f.label];
                  return (
                    <td key={i} className="px-4 py-3 text-slate-300 max-w-[200px]">
                      {val ? (
                        // If it looks like a URL (file upload), show a link
                        typeof val === 'string' && val.startsWith('http') ? (
                          <a
                            href={val}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                            Lihat File
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
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : <span className="text-slate-700">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">
              {tab === 'belum' ? '✅' : '📭'}
            </div>
            <p className="text-slate-400">
              {tab === 'belum' && !search
                ? 'Semua anggota sudah absen!'
                : `Tidak ada hasil${search ? ` untuk "${search}"` : ''}`
              }
            </p>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-700/30 text-xs text-slate-500 flex items-center justify-between">
          <span>Menampilkan {filtered.length} dari {merged.length} anggota</span>
          {tab !== 'semua' && (
            <button onClick={() => setTab('semua')} className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Lihat semua
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
