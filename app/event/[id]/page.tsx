import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AbsensiForm from './AbsensiForm';
import Link from 'next/link';
import { ArrowLeft, Megaphone, LockSimple } from '@phosphor-icons/react/dist/ssr';

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
    <main className="min-h-[100dvh] animated-bg text-white relative overflow-hidden">
      {/* Background Decorative Tech Blobs */}
      <div className="fixed w-96 h-96 rounded-full bg-blue-600/12 top-0 left-0 -translate-x-1/4 -translate-y-1/4 blur-3xl pointer-events-none z-0" />
      <div className="fixed w-80 h-80 rounded-full bg-amber-500/8 bottom-0 right-0 translate-x-1/4 translate-y-1/4 blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-300 text-xs sm:text-sm font-semibold transition-colors group"
        >
          <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-1 transition-transform" />
          Kembali ke Portal Beranda
        </Link>

        {/* Event Banner Header */}
        <div className="tech-card p-6 sm:p-7 slide-up border border-blue-500/25 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white p-2 border-2 border-blue-500/40 flex items-center justify-center shrink-0 glow-blue shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.ico"
                alt="Logo IT 26"
                className="w-full h-full object-contain"
              />
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
                <Megaphone size={14} weight="bold" />
                Informasi &amp; Petunjuk Acara:
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
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <LockSimple size={32} weight="bold" className="text-red-400" />
            </div>
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
