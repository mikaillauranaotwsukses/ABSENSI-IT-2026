import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from './LogoutButton';

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
    <main className="min-h-screen animated-bg text-white">
      {/* Blob decorations */}
      <div className="blob w-96 h-96 bg-indigo-700 fixed -top-24 -left-24 pointer-events-none" />
      <div className="blob w-72 h-72 bg-purple-700 fixed bottom-0 right-0 translate-x-1/4 translate-y-1/4 pointer-events-none" />

      <div className="relative z-10">
        {/* Top Nav */}
        <nav className="glass border-b border-indigo-500/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/40 flex items-center justify-center text-lg">
                🎓
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
            <h1 className="text-3xl font-bold text-white mb-1">Dashboard Administrator</h1>
            <p className="text-slate-400">Selamat datang kembali, admin!</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 slide-up">
            {[
              { label: 'Total Anggota', value: totalAnggota ?? 0, icon: '👥', color: 'indigo' },
              { label: 'Total Event', value: totalEvent ?? 0, icon: '📅', color: 'purple' },
              { label: 'Total Absensi', value: totalAbsensi ?? 0, icon: '✅', color: 'cyan' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{stat.icon}</span>
                  <div className={`px-2 py-0.5 rounded-full text-xs ${
                    stat.color === 'indigo' ? 'bg-indigo-600/20 text-indigo-300' :
                    stat.color === 'purple' ? 'bg-purple-600/20 text-purple-300' :
                    'bg-cyan-600/20 text-cyan-300'
                  }`}>
                    Total
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions (3 Cards) */}
          <div className="grid md:grid-cols-3 gap-4 mb-8 slide-up">
            <Link
              href="/portal-it-admin/scan"
              className="glass-card rounded-2xl p-5 hover:border-cyan-500/40 hover:glow-cyan transition-all duration-300 group flex items-center gap-4 border border-cyan-500/20"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-600/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📷
              </div>
              <div>
                <h3 className="font-semibold text-white">Scanner QR Panitia</h3>
                <p className="text-slate-400 text-xs">Scan QR tiket anggota di lokasi acara</p>
              </div>
            </Link>

            <Link
              href="/portal-it-admin/events/new"
              className="glass-card rounded-2xl p-5 hover:border-indigo-500/40 hover:glow-indigo transition-all duration-300 group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-600/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                ➕
              </div>
              <div>
                <h3 className="font-semibold text-white">Buat Event Baru</h3>
                <p className="text-slate-400 text-xs">Tambah event dan susun form absensi</p>
              </div>
            </Link>

            <Link
              href="/portal-it-admin/events"
              className="glass-card rounded-2xl p-5 hover:border-purple-500/40 hover:glow-purple transition-all duration-300 group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-600/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📋
              </div>
              <div>
                <h3 className="font-semibold text-white">Kelola Event</h3>
                <p className="text-slate-400 text-xs">Edit, tutup, atau lihat laporan absensi</p>
              </div>
            </Link>
          </div>

          {/* Recent events */}
          <div className="glass-card rounded-2xl p-6 slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">Event Terbaru</h2>
              <Link href="/portal-it-admin/events" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                Lihat semua →
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
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
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
