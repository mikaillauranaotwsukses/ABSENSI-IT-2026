import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import EventStatusToggle from './EventStatusToggle';
import DeleteEventButton from './DeleteEventButton';
import { ArrowLeft, Plus, Tray, ClipboardText } from '@phosphor-icons/react/dist/ssr';
import { parseEventConfig, cleanEventDeskripsi } from '@/lib/eventConfig';

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
    <main className="min-h-[100dvh] animated-bg text-white">
      <div className="fixed w-96 h-96 rounded-full bg-blue-600/15 -top-24 -left-24 blur-3xl pointer-events-none z-0" />
      <div className="fixed w-72 h-72 rounded-full bg-amber-500/10 bottom-0 right-0 translate-x-1/4 translate-y-1/4 blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 slide-up">
          <div className="flex items-center gap-3">
            <Link href="/portal-it-admin" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Manajemen Event</h1>
              <p className="text-slate-400 text-sm">{events?.length ?? 0} event terdaftar</p>
            </div>
          </div>
          <Link
            href="/portal-it-admin/events/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary text-xs uppercase font-bold tracking-wider transition-all"
          >
            <Plus size={16} weight="bold" />
            Buat Event
          </Link>
        </div>

        {/* Table */}
        <div className="tech-card rounded-2xl overflow-hidden slide-up border border-slate-700/60">
          {(!events || events.length === 0) ? (
            <div className="text-center py-16">
              <Tray size={52} className="mx-auto mb-4 text-slate-600" weight="regular" />
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
                    const evConfig = parseEventConfig(ev);
                    const cleanDesc = cleanEventDeskripsi(ev.deskripsi);
                    const absensiCount = Array.isArray(ev.absensi)
                      ? (ev.absensi[0]?.count ?? 0)
                      : 0;
                    return (
                      <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-medium">{ev.nama_event}</p>
                              {evConfig.is_qr_enabled === false && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700" title="Fitur Tiket QR dinonaktifkan">
                                  QR Off
                                </span>
                              )}
                              {evConfig.is_feedback_enabled === false && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700" title="Fitur Feedback dinonaktifkan">
                                  Feedback Off
                                </span>
                              )}
                            </div>
                            {cleanDesc && (
                              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{cleanDesc}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm hidden sm:table-cell">
                          {new Date(ev.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600/20 text-blue-300 text-sm font-semibold border border-blue-500/20">
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
                              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 text-xs font-semibold transition-colors border border-blue-500/20"
                              title="Lihat Laporan & Absensi"
                            >
                              Laporan
                            </Link>
                            <Link
                              href={`/portal-it-admin/events/new?copy_from=${ev.id}`}
                              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold transition-colors inline-flex items-center gap-1 border border-amber-500/20"
                              title="Duplikat susunan form & feedback event ini untuk acara baru"
                            >
                              <ClipboardText size={13} weight="bold" /> Duplikat
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
