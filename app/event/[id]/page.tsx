import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AbsensiForm from './AbsensiForm';

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
      {/* Decorative blobs */}
      <div className="blob w-96 h-96 bg-indigo-600 -top-24 -left-24" />
      <div className="blob w-72 h-72 bg-purple-700 bottom-0 right-0 translate-x-1/4 translate-y-1/4" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-300 text-sm mb-8 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Daftar Event
        </a>

        {/* Event header */}
        <div className="glass rounded-2xl p-6 mb-6 slide-up">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 flex items-center justify-center text-2xl shrink-0">
              📋
            </div>
            <div className="flex-1 min-w-0">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${event.status ? 'badge-open' : 'badge-closed'}`}>
                {event.status ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    Sedang Buka
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Ditutup
                  </>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">{event.nama_event}</h1>
              <p className="text-slate-400 text-sm mt-1">
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
            <div className="mt-5 p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                </svg>
                Informasi Event
              </div>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {event.deskripsi}
              </p>
            </div>
          )}
        </div>

        {/* Absensi form */}
        {event.status ? (
          <AbsensiForm event={event} />
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center slide-up">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2">
              Absensi Ditutup
            </h3>
            <p className="text-slate-400 text-sm">
              Form absensi untuk event ini sudah tidak dapat diisi.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
