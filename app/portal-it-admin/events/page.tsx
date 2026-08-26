import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import EventStatusToggle from './EventStatusToggle';
import DeleteEventButton from './DeleteEventButton';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/portal-it-admin/login');

  const { data: events } = await supabase
    .from('event')
    .select('*, absensi(count)')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen animated-bg text-white">
      <div className="fixed w-96 h-96 rounded-full bg-indigo-700/20 -top-24 -left-24 blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 slide-up">
          <div className="flex items-center gap-3">
            <Link href="/portal-it-admin" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Manajemen Event</h1>
              <p className="text-slate-400 text-sm">{events?.length ?? 0} event terdaftar</p>
            </div>
          </div>
          <Link
            href="/portal-it-admin/events/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium transition-all glow-indigo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Buat Event
          </Link>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden slide-up">
          {(!events || events.length === 0) ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-400">Belum ada event. Buat event pertama kamu!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nama Event</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Dibuat</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Hadir</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {events.map((ev) => {
                    const absensiCount = Array.isArray(ev.absensi)
                      ? (ev.absensi[0]?.count ?? 0)
                      : 0;
                    return (
                      <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">{ev.nama_event}</p>
                            {ev.deskripsi && (
                              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{ev.deskripsi}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm hidden sm:table-cell">
                          {new Date(ev.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-300 text-sm font-semibold">
                            {absensiCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <EventStatusToggle eventId={ev.id} initialStatus={ev.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                            <Link
                              href={`/portal-it-admin/absensi/${ev.id}`}
                              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-medium transition-colors"
                              title="Lihat Laporan & Absensi"
                            >
                              Laporan
                            </Link>
                            <Link
                              href={`/portal-it-admin/events/new?copy_from=${ev.id}`}
                              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs font-medium transition-colors flex items-center gap-1"
                              title="Duplikat susunan form & feedback event ini untuk acara baru"
                            >
                              <span>📋</span> Duplikat
                            </Link>
                            <Link
                              href={`/portal-it-admin/events/${ev.id}/edit`}
                              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                            >
                              Edit
                            </Link>
                            <DeleteEventButton eventId={ev.id} eventName={ev.nama_event} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
