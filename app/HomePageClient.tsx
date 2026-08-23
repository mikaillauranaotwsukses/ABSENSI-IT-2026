'use client';

import { useMemberAuth } from '@/lib/context/MemberAuthContext';
import { Event } from '@/lib/types';
import Link from 'next/link';

interface Props {
  events: Event[] | null;
  error: boolean;
}

export default function HomePageClient({ events, error }: Props) {
  const { member, logoutMember, setShowChangePasswordModal } = useMemberAuth();

  return (
    <main className="min-h-screen animated-bg text-white relative overflow-hidden">
      {/* Background blobs */}
      <div className="blob w-96 h-96 bg-indigo-600 top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <div className="blob w-80 h-80 bg-purple-600 bottom-0 right-0 translate-x-1/3 translate-y-1/3" />
      <div className="blob w-64 h-64 bg-cyan-500 top-1/2 right-1/4" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Top User Status Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl glass mb-10 slide-up">
          {member ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-base shrink-0 glow-indigo">
                {member.nama.charAt(0)}
              </div>
              <div>
                <p className="text-white font-bold text-sm flex items-center gap-2">
                  {member.nama}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    Aktif
                  </span>
                </p>
                <p className="text-slate-400 text-xs font-mono">
                  {member.nrp} • {member.program_studi}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 text-xl shrink-0">
                🔒
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Belum Login</p>
                <p className="text-slate-400 text-xs">Silakan login dengan NRP & Password Anda</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {member ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(true)}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 text-slate-300 text-xs font-medium transition-all"
                >
                  🔑 Ganti Password
                </button>
                <button
                  type="button"
                  onClick={logoutMember}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs font-medium transition-all"
                >
                  🚪 Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs transition-all glow-indigo text-center"
              >
                🔑 Login Anggota
              </Link>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12 slide-up flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl glass p-2 flex items-center justify-center mb-4 border border-indigo-500/30 shadow-2xl glow-indigo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.ico"
              alt="Logo Absensi IT 26"
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-indigo-300 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Sistem Absensi Digital Anggota IT 26
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="gradient-text">ABSENSI</span> <span className="text-white">IT 26</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Pilih event di bawah untuk mengisi keterangan absensi atau menampilkan Tiket QR Anda.
          </p>
        </div>

        {/* Events section */}
        <div className="slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <h2 className="text-slate-300 font-medium text-xs uppercase tracking-widest px-3">
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
              {events.map((event: Event, idx: number) => {
                const targetUrl = member ? `/event/${event.id}` : '/login';

                return (
                  <Link
                    key={event.id}
                    href={targetUrl}
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
                        {member ? 'Buka Form & QR →' : 'Login untuk Absen →'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-16">
          © 2026 Mahasiswa Teknologi Informasi · Absensi IT 26
        </p>
      </div>
    </main>
  );
}
