import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AbsensiForm from './AbsensiForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from('event')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !event) return notFound();

  return (
    <main className="min-h-screen animated-bg text-white relative overflow-hidden">
      {/* Background Decorative Tech Blobs */}
      <div className="blob w-96 h-96 bg-blue-600/15 top-0 left-0 -translate-x-1/4 pointer-events-none" />
      <div className="blob w-80 h-80 bg-amber-500/10 bottom-0 right-0 pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-300 text-xs sm:text-sm font-semibold transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Portal Beranda
        </Link>

        {/* Event Banner Header */}
        <div className="tech-card p-6 sm:p-7 slide-up border border-blue-500/25 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-3xl shrink-0 glow-blue">
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${event.status ? 'badge-open' : 'badge-closed'}`}>
                  {event.status ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Sedang Buka
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Ditutup
                    </>
                  )}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                {event.nama_event}
              </h1>
              <p className="text-slate-400 text-xs font-mono mt-1">
                {new Date(event.created_at).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Broadcast / Deskripsi */}
          {event.deskripsi && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                </svg>
                Informasi & Petunjuk Acara:
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                {event.deskripsi}
              </p>
            </div>
          )}
        </div>

        {/* Absensi Form 3-Tab Component */}
        {event.status ? (
          <AbsensiForm event={event} />
        ) : (
          <div className="tech-card p-10 text-center slide-up border border-red-500/20">
            <div className="text-5xl mb-3">🔒</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Absensi Ditutup
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
              Sesi pengisian absensi untuk event ini telah dinonaktifkan oleh panitia.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
