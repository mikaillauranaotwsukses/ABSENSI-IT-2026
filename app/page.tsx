import { createClient } from '@/lib/supabase/server';
import { Event } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from('event')
    .select('*')
    .eq('status', true)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen animated-bg text-white relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="blob w-96 h-96 bg-indigo-600 top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <div className="blob w-80 h-80 bg-purple-600 bottom-0 right-0 translate-x-1/3 translate-y-1/3" />
      <div className="blob w-64 h-64 bg-cyan-500 top-1/2 right-1/4" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16 slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-indigo-300 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Sistem Absensi Digital
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">ABSENSI</span>
            <br />
            <span className="text-white">IT 26</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Mahasiswa Teknologi Informasi — Sistem kehadiran digital yang cepat dan mudah.
          </p>
        </div>

        {/* Events section */}
        <div className="slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <h2 className="text-slate-300 font-medium text-sm uppercase tracking-widest px-3">
              Event Aktif
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          </div>

          {error && (
            <div className="glass-card rounded-2xl p-6 text-center text-red-400">
              <p>Gagal memuat daftar event. Silakan refresh halaman.</p>
            </div>
          )}

          {!error && (!events || events.length === 0) && (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4 float-anim">📋</div>
              <h3 className="text-slate-300 font-semibold text-xl mb-2">
                Belum Ada Event Aktif
              </h3>
              <p className="text-slate-500">
                Pantau terus ya! Event baru akan muncul di sini.
              </p>
            </div>
          )}

          {events && events.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              {events.map((event: Event, idx: number) => (
                <Link
                  key={event.id}
                  href={`/event/${event.id}`}
                  className="group glass-card rounded-2xl p-6 hover:border-indigo-500/40 hover:glow-indigo transition-all duration-300 hover:-translate-y-1 block"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="badge-open inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                        </span>
                        Sedang Buka
                      </div>
                      <h3 className="text-white font-bold text-xl group-hover:text-indigo-300 transition-colors">
                        {event.nama_event}
                      </h3>
                    </div>
                    <div className="ml-3 w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/40 transition-colors shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {event.deskripsi && (
                    <p className="text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                      {event.deskripsi}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                      </svg>
                      {new Date(event.created_at).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    <span className="text-indigo-400 text-xs font-medium group-hover:text-indigo-300 transition-colors">
                      Absen sekarang →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-16">
          © 2026 Teknologi Informasi · Institut Teknologi Sepuluh Nopember
        </p>
      </div>
    </main>
  );
}
