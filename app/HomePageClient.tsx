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
      {/* Background blobs */}
      <div className="blob w-96 h-96 bg-indigo-600 top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <div className="blob w-80 h-80 bg-purple-600 bottom-0 right-0 translate-x-1/3 translate-y-1/3" />
      <div className="blob w-64 h-64 bg-cyan-500 top-1/2 right-1/4" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Top User Status Bar / Client Profile Banner */}
        <div className="p-4 sm:p-6 rounded-3xl glass mb-8 slide-up border border-indigo-500/20 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            {member ? (
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 border border-indigo-400/40 flex items-center justify-center text-white font-extrabold text-2xl shrink-0 glow-indigo shadow-lg">
                  {member.nama.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-lg truncate">{member.nama}</h2>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 font-semibold">
                      Anggota Aktif
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-mono mt-0.5">
                    {member.nrp} • <span className="text-indigo-300">{member.program_studi}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 text-2xl shrink-0">
                  🔒
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Portal Absensi Anggota IT 26</p>
                  <p className="text-slate-400 text-xs">Silakan login dengan NRP & Password Anda</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              {member ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordModal(true)}
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 text-slate-200 text-xs font-medium transition-all shadow"
                  >
                    🔑 Ganti Password
                  </button>
                  <button
                    type="button"
                    onClick={logoutMember}
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs font-medium transition-all shadow"
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all glow-indigo text-center shadow-lg"
                >
                  🔑 Login Anggota
                </Link>
              )}
            </div>
          </div>

          {/* Member KPI Summary Statistics (When Logged in) */}
          {member && (
            <div className="grid grid-cols-3 gap-3 pt-5 mt-5 border-t border-slate-700/50">
              <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40 text-center">
                <p className="text-slate-400 text-[11px]">Event Tersedia</p>
                <p className="text-lg sm:text-xl font-bold text-white mt-0.5">{totalEvents}</p>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-center">
                <p className="text-indigo-300 text-[11px]">Event Diikuti</p>
                <p className="text-lg sm:text-xl font-bold text-indigo-200 mt-0.5">{attendedCount}</p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25 text-center">
                <p className="text-purple-300 text-[11px]">Feedback Diberikan</p>
                <p className="text-lg sm:text-xl font-bold text-purple-200 mt-0.5">{feedbackCount}</p>
              </div>
            </div>
          )}
        </div>

        {/* Brand Header */}
        <div className="text-center mb-10 slide-up flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-white p-2.5 flex items-center justify-center mb-4 border border-white/40 shadow-2xl shadow-indigo-500/30 glow-indigo transition-transform hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.ico"
              alt="Logo Absensi IT 26"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-indigo-300 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Sistem Absensi Digital Anggota IT 26
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold mb-3 tracking-tight">
            <span className="gradient-text">PORTAL ABSENSI</span> <span className="text-white">IT 26</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            Pilih event di bawah untuk mengisi form keterangan, membuka Tiket QR kehadiran di lokasi, atau mengisi feedback evaluasi acara.
          </p>
        </div>

        {/* Events Search & Section Header */}
        <div className="slide-up space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
              <span>📅</span> Daftar Event
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                {filteredEvents.length}
              </span>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari event..."
                className="input-glow w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500"
              />
            </div>
          </div>

          {error && (
            <div className="glass-card rounded-2xl p-6 text-center text-red-400 border border-red-500/20">
              <p>Gagal memuat daftar event. Silakan refresh halaman.</p>
            </div>
          )}

          {!error && filteredEvents.length === 0 && (
            <div className="glass-card rounded-3xl p-12 text-center border border-slate-700/50">
              <div className="text-5xl mb-3 float-anim">📋</div>
              <h3 className="text-slate-300 font-semibold text-lg mb-1">
                Belum Ada Event Ditemukan
              </h3>
              <p className="text-slate-500 text-xs">
                {searchFilter ? 'Coba cari dengan kata kunci lain.' : 'Pantau terus! Event baru akan muncul di sini.'}
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
                    className="glass-card rounded-3xl p-6 hover:border-indigo-500/40 hover:glow-indigo transition-all duration-300 flex flex-col justify-between space-y-4 border border-slate-700/50 shadow-xl"
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="badge-open inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                            </span>
                            Sedang Berlangsung
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(event.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>

                      <h3 className="text-white font-bold text-xl mb-2 hover:text-indigo-300 transition-colors">
                        {event.nama_event}
                      </h3>

                      {event.deskripsi && (
                        <p className="text-slate-400 text-xs line-clamp-3 mb-4 leading-relaxed whitespace-pre-line">
                          {event.deskripsi}
                        </p>
                      )}

                      {/* Logged in member status badges */}
                      {member && (
                        <div className="grid grid-cols-3 gap-1.5 pt-3 pb-2 border-t border-slate-700/40">
                          <div className={`p-2 rounded-xl text-center border text-[10px] font-semibold ${
                            memberAbs?.is_form_filled
                              ? 'bg-green-500/15 border-green-500/30 text-green-300'
                              : 'bg-slate-800/60 border-slate-700 text-slate-400'
                          }`}>
                            <span>📝</span> {memberAbs?.is_form_filled ? '✓ Form Terisi' : 'Form Belum'}
                          </div>

                          <div className={`p-2 rounded-xl text-center border text-[10px] font-semibold ${
                            memberAbs?.is_qr_scanned
                              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                              : 'bg-slate-800/60 border-slate-700 text-slate-400'
                          }`}>
                            <span>📱</span> {memberAbs?.is_qr_scanned ? '✓ QR Discan' : 'QR Belum'}
                          </div>

                          <div className={`p-2 rounded-xl text-center border text-[10px] font-semibold ${
                            memberFb
                              ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                              : 'bg-slate-800/60 border-slate-700 text-slate-400'
                          }`}>
                            <span>⭐</span> {memberFb ? '✓ Feedback' : 'Feedback Belum'}
                          </div>
                        </div>
                      )}
                    </div>

                    <Link
                      href={targetUrl}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all glow-indigo text-center flex items-center justify-center gap-2 shadow"
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

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 pt-8 border-t border-slate-800">
          <p>© 2026 Mahasiswa Teknologi Informasi · Absensi IT 26</p>
        </footer>
      </div>
    </main>
  );
}
