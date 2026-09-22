import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from './LogoutButton';
import { Users, CalendarBlank, CheckCircle, QrCode, Plus, ListBullets, ArrowRight } from '@phosphor-icons/react/dist/ssr';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/portal-it-admin/login');

  // Stats
  const [{ count: totalAnggota }, { count: totalEvent }, { count: totalAbsensi }] =
    await Promise.all([
      supabase.from('anggota').select('*', { count: 'exact', head: true }),
      supabase.from('event').select('*', { count: 'exact', head: true }),
      supabase.from('absensi').select('*', { count: 'exact', head: true }),
    ]);

  const { data: events } = await supabase
    .from('event')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <main className="min-h-[100dvh] animated-bg text-white">
      {/* Blob decorations */}
      <div className="fixed w-96 h-96 rounded-full bg-blue-600/15 -top-24 -left-24 blur-3xl pointer-events-none z-0" />
      <div className="fixed w-72 h-72 rounded-full bg-amber-500/10 bottom-0 right-0 translate-x-1/4 translate-y-1/4 blur-3xl pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Top Nav */}
        <nav className="glass border-b border-blue-500/15 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center border border-white/40 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/favicon.ico"
                  alt="Logo Absensi IT 26"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-white">Portal Admin</span>
                <span className="text-slate-400 text-xs ml-2">IT 26</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-400 text-sm hidden sm:block">{user.email}</span>
              <LogoutButton />
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Welcome */}
          <div className="mb-8 slide-up">
            <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">Dashboard Administrator</h1>
            <p className="text-slate-400 text-sm">Selamat datang kembali di panel operasional presensi IT 2026.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 slide-up">
            {[
              { label: 'Total Anggota',  value: totalAnggota ?? 0,  Icon: Users,         badgeClass: 'badge-tech-blue'  },
              { label: 'Total Event',    value: totalEvent ?? 0,    Icon: CalendarBlank, badgeClass: 'badge-tech-amber' },
              { label: 'Total Absensi', value: totalAbsensi ?? 0,  Icon: CheckCircle,   badgeClass: 'badge-open'       },
            ].map((stat) => (
              <div key={stat.label} className="tech-card p-5 border border-blue-500/20">
                <div className="flex items-center justify-between mb-3">
                  <stat.Icon size={22} weight="bold" className="text-slate-400" aria-hidden="true" />
                  <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${stat.badgeClass}`}>
                    Total
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-white font-mono">{stat.value}</p>
                <p className="text-slate-400 text-xs mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions (3 Cards) */}
          <div className="grid md:grid-cols-3 gap-4 mb-8 slide-up">
            <Link
              href="/portal-it-admin/scan"
              className="tech-card tech-card-hover p-5 border border-cyan-500/30 transition-all group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode size={24} weight="bold" className="text-cyan-300" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Scanner QR Panitia</h3>
                <p className="text-slate-400 text-xs mt-0.5">Scan QR tiket anggota di lokasi acara</p>
              </div>
            </Link>

            <Link
              href="/portal-it-admin/events/new"
              className="tech-card tech-card-hover p-5 border border-blue-500/30 transition-all group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={24} weight="bold" className="text-blue-300" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Buat Event Baru</h3>
                <p className="text-slate-400 text-xs mt-0.5">Tambah event dan susun form absensi</p>
              </div>
            </Link>

            <Link
              href="/portal-it-admin/events"
              className="tech-card tech-card-hover p-5 border border-amber-500/30 transition-all group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ListBullets size={24} weight="bold" className="text-[#ffc878]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Kelola Event</h3>
                <p className="text-slate-400 text-xs mt-0.5">Lihat semua event dan daftar absensi</p>
              </div>
            </Link>
          </div>

          {/* Recent Events */}
          <div className="tech-card p-6 border border-blue-500/20 slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-white">Event Terbaru</h2>
              <Link href="/portal-it-admin/events" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors">
                Lihat Semua <ArrowRight size={12} weight="bold" />
              </Link>
            </div>
            {events && events.length > 0 ? (
              <div className="space-y-3">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${ev.status ? 'bg-green-400' : 'bg-slate-500'}`} />
                      <span className="text-sm text-slate-200">{ev.nama_event}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ev.status ? 'badge-open' : 'badge-closed'}`}>
                        {ev.status ? 'Buka' : 'Tutup'}
                      </span>
                      <Link
                        href={`/portal-it-admin/absensi/${ev.id}`}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                      >
                        Laporan
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">Belum ada event.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
