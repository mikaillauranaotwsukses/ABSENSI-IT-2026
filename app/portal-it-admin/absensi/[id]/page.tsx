import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import AbsensiReportClient from './AbsensiReportClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AbsensiReportPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/portal-it-admin/login');

  const { data: event, error: eventError } = await supabase
    .from('event')
    .select('*')
    .eq('id', id)
    .single();

  if (eventError || !event) return notFound();

  // Fetch ALL anggota + ALL absensi for this event in parallel
  const [{ data: allAnggota }, { data: absensiList }] = await Promise.all([
    supabase.from('anggota').select('*').order('nama'),
    supabase.from('absensi').select('*').eq('event_id', id).order('created_at'),
  ]);

  const hadirCount = absensiList?.length ?? 0;
  const totalCount = allAnggota?.length ?? 0;
  const belumCount = totalCount - hadirCount;

  return (
    <main className="min-h-screen animated-bg text-white">
      <div className="blob w-96 h-96 bg-indigo-700 fixed -top-24 -left-24 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="slide-up mb-8">
          <div className="flex items-center gap-3 mb-5">
            <Link href="/portal-it-admin/events" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Laporan Absensi</h1>
              <p className="text-slate-400 text-sm">{event.nama_event}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4">
              <p className="text-3xl font-bold text-white">{totalCount}</p>
              <p className="text-slate-400 text-sm mt-0.5">Total Anggota</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-3xl font-bold text-green-400">{hadirCount}</p>
              <p className="text-slate-400 text-sm mt-0.5">Sudah Hadir</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-3xl font-bold text-red-400">{belumCount}</p>
              <p className="text-slate-400 text-sm mt-0.5">Belum Absen</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-green-500 rounded-full transition-all"
                    style={{ width: `${totalCount > 0 ? (hadirCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <p className="text-2xl font-bold text-indigo-300">
                {totalCount > 0 ? Math.round((hadirCount / totalCount) * 100) : 0}%
              </p>
              <p className="text-slate-400 text-sm mt-0.5">Kehadiran</p>
            </div>
          </div>
        </div>

        {/* Client component: tabbed roster + detail view */}
        <AbsensiReportClient
          event={event}
          allAnggota={allAnggota ?? []}
          absensiList={absensiList ?? []}
        />
      </div>
    </main>
  );
}
