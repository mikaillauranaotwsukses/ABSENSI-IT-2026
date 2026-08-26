'use client';

import { useState, useEffect } from 'react';
import { useMemberAuth } from '@/lib/context/MemberAuthContext';
import { createClient } from '@/lib/supabase/client';
import { Event, Absensi, Feedback } from '@/lib/types';
import Link from 'next/link';

interface Props {
  events: Event[] | null;
  error: boolean;
}

export default function HomePageClient({ events, error }: Props) {
  const supabase = createClient();
  const { member, logoutMember, setShowChangePasswordModal } = useMemberAuth();

  const [memberAbsensiMap,  setMemberAbsensiMap]  = useState<Record<string, Absensi>>({});
  const [memberFeedbackMap, setMemberFeedbackMap] = useState<Record<string, Feedback>>({});
  const [searchFilter,      setSearchFilter]      = useState('');

  // Fetch logged-in member's participation across all events
  useEffect(() => {
    if (!member?.nrp) return;

    async function loadMemberHistory() {
      try {
        const { data: absData } = await supabase
          .from('absensi')
          .select('*')
          .eq('nrp', member!.nrp);

        if (absData) {
          const aMap: Record<string, Absensi> = {};
          absData.forEach((a: Absensi) => { aMap[a.event_id] = a; });
          setMemberAbsensiMap(aMap);
        }

        const { data: fbData } = await supabase
          .from('feedback')
          .select('*')
          .eq('nrp', member!.nrp);

        if (fbData) {
          const fMap: Record<string, Feedback> = {};
          fbData.forEach((f: Feedback) => { fMap[f.event_id] = f; });
          setMemberFeedbackMap(fMap);
        }
      } catch (e) {
        console.warn('Load member history notice:', e);
      }
    }

    loadMemberHistory();
  }, [member?.nrp, supabase]);

  const filteredEvents = (events || []).filter((e) => {
    if (!searchFilter.trim()) return true;
    return e.nama_event.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (e.deskripsi && e.deskripsi.toLowerCase().includes(searchFilter.toLowerCase()));
  });

  const totalEvents = events?.length || 0;
  const attendedCount = Object.values(memberAbsensiMap).filter(
    (a) => a.is_form_filled || a.is_qr_scanned
  ).length;
  const feedbackCount = Object.keys(memberFeedbackMap).length;

  return (
    <main className="min-h-screen animated-bg text-white relative overflow-hidden">
      {/* Background Decorative Tech Blobs */}
      <div className="blob w-96 h-96 bg-blue-600/15 top-0 left-0 -translate-x-1/3 pointer-events-none" />
      <div className="blob w-80 h-80 bg-amber-500/10 bottom-0 right-0 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* ── MEMBER PROFILE / ACCESS HEADER BAR ── */}
        <div className="tech-card p-5 sm:p-7 border border-blue-500/25 shadow-2xl slide-up">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            {member ? (
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border-2 border-blue-400/40 flex items-center justify-center text-white font-extrabold text-2xl shrink-0 shadow-lg glow-blue">
                  {member.nama.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-extrabold text-base sm:text-lg truncate tracking-tight">{member.nama}</h2>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full badge-open font-bold uppercase tracking-wider">
                      ✓ Anggota IT 26
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-mono mt-0.5">
                    NRP: <span className="text-[#ffc878] font-bold">{member.nrp}</span> • <span className="text-blue-300">{member.program_studi}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-300 text-xl shrink-0 glow-blue">
                  ⚡
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Portal Presensi Terpadu IT 2026</p>
                  <p className="text-slate-400 text-xs">Silakan masuk menggunakan NRP untuk mengakses tiket presensi</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              {member ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordModal(true)}
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600/60 text-slate-200 text-xs font-bold transition-all shadow"
                  >
                    🔑 Ganti Password
                  </button>
                  <button
                    type="button"
                    onClick={logoutMember}
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-300 text-xs font-bold transition-all shadow"
                  >
                    Keluar
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="w-full md:w-auto btn-primary h-11 text-xs uppercase tracking-wider font-bold shadow-lg"
                >
                  🔑 Masuk Anggota →
                </Link>
              )}
            </div>
          </div>

          {/* Member KPI Summary Statistics (When Logged in) */}
          {member && (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-5 mt-5 border-t border-slate-800">
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                <p className="text-slate-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Event Tersedia</p>
                <p className="text-lg sm:text-2xl font-extrabold text-white mt-0.5">{totalEvents}</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-blue-950/40 border border-blue-500/25 text-center">
                <p className="text-blue-300 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Event Diikuti</p>
                <p className="text-lg sm:text-2xl font-extrabold text-[#c8dcff] mt-0.5">{attendedCount}</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-amber-950/30 border border-amber-500/25 text-center">
                <p className="text-amber-300 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Feedback Terkirim</p>
                <p className="text-lg sm:text-2xl font-extrabold text-[#ffc878] mt-0.5">{feedbackCount}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── HERO BRAND HEADER ── */}
        <div className="text-center slide-up flex flex-col items-center space-y-3.5 py-4">
          <div className="w-20 h-20 rounded-2xl bg-white p-2.5 flex items-center justify-center border-2 border-blue-500/30 shadow-2xl glow-blue transition-transform hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.ico"
              alt="Logo Absensi IT 26"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full badge-tech-blue text-xs font-bold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Digital Attendance & Event Portal
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            PORTAL ABSENSI <span className="gradient-text-ifest">IT 2026</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            Pilih event aktif di bawah ini untuk melengkapi form absensi, menampilkan Tiket QR digital di lokasi, dan mengirimkan ulasan evaluasi acara.
          </p>
        </div>

        {/* ── EVENTS SEARCH & LIST ── */}
        <div className="slide-up space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white font-extrabold text-base tracking-tight">
              <span>⚡</span> Daftar Acara Aktif
              <span className="text-xs px-2.5 py-0.5 rounded-full badge-tech-amber font-mono font-bold">
                {filteredEvents.length} Event
              </span>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari nama event..."
                className="input-glow w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="tech-card p-6 text-center text-red-400 border border-red-500/30">
              <p>Gagal memuat daftar event. Silakan muat ulang halaman.</p>
            </div>
          )}

          {!error && filteredEvents.length === 0 && (
            <div className="tech-card p-12 text-center border border-slate-800">
              <div className="text-5xl mb-3 float-anim">📋</div>
              <h3 className="text-white font-bold text-base mb-1">
                Belum Ada Event Ditemukan
              </h3>
              <p className="text-slate-400 text-xs">
                {searchFilter ? 'Coba cari dengan kata kunci lain.' : 'Pantau terus! Event baru akan segera muncul di sini.'}
              </p>
            </div>
          )}

          {filteredEvents.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredEvents.map((event: Event, idx: number) => {
                const targetUrl = member ? `/event/${event.id}` : '/login';
                const memberAbs = memberAbsensiMap[event.id];
                const memberFb  = memberFeedbackMap[event.id];

                return (
                  <div
                    key={event.id}
                    className="tech-card tech-card-hover p-6 flex flex-col justify-between space-y-4 border border-blue-500/20"
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="badge-open inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Sedang Berlangsung
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(event.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>

                      <h3 className="text-white font-extrabold text-lg sm:text-xl leading-snug tracking-tight hover:text-blue-300 transition-colors">
                        {event.nama_event}
                      </h3>

                      {event.deskripsi && (
                        <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed whitespace-pre-line">
                          {event.deskripsi}
                        </p>
                      )}

                      {/* Logged in member status badges */}
                      {member && (
                        <div className="grid grid-cols-3 gap-1.5 pt-3 pb-1 border-t border-slate-800">
                          <div className={`p-2 rounded-xl text-center border text-[10px] font-bold ${
                            memberAbs?.is_form_filled
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-900/60 border-slate-800 text-slate-500'
                          }`}>
                            <span>📝</span> {memberAbs?.is_form_filled ? '✓ Form OK' : 'Form Belum'}
                          </div>

                          <div className={`p-2 rounded-xl text-center border text-[10px] font-bold ${
                            memberAbs?.is_qr_scanned
                              ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                              : 'bg-slate-900/60 border-slate-800 text-slate-500'
                          }`}>
                            <span>📱</span> {memberAbs?.is_qr_scanned ? '✓ QR Discan' : 'QR Belum'}
                          </div>

                          <div className={`p-2 rounded-xl text-center border text-[10px] font-bold ${
                            memberFb
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              : 'bg-slate-900/60 border-slate-800 text-slate-500'
                          }`}>
                            <span>⭐</span> {memberFb ? '✓ Feedback' : 'Feedback Belum'}
                          </div>
                        </div>
                      )}
                    </div>

                    <Link
                      href={targetUrl}
                      className="w-full btn-primary h-12 text-xs uppercase tracking-wider font-bold shadow-md rounded-xl"
                    >
                      <span>{member ? 'Buka Form, Tiket & Feedback' : 'Login untuk Mengisi Absensi'}</span>
                      <span>→</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer className="text-center text-xs text-slate-500 pt-8 border-t border-slate-800/80 space-y-1">
          <p className="font-semibold text-slate-400">© 2026 Mahasiswa S1 Teknologi Informasi · Absensi IT 26</p>
          <p className="text-[11px] text-slate-600">Built with High Performance & Tech-Forward Architecture</p>
        </footer>
      </div>
    </main>
  );
}
