'use client';

import { useState, useEffect } from 'react';
import { useMemberAuth } from '@/lib/context/MemberAuthContext';
import { createClient } from '@/lib/supabase/client';
import { Event, Absensi, Feedback } from '@/lib/types';
import { parseEventConfig, cleanEventDeskripsi } from '@/lib/eventConfig';
import Link from 'next/link';
import {
  Key,
  CalendarBlank,
  NotePencil,
  DeviceMobile,
  Star,
  CheckCircle,
  Tray,
  ArrowRight,
} from '@phosphor-icons/react';

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
  const [categoryFilter,    setCategoryFilter]    = useState<'all' | 'form' | 'event'>('all');
  const [statusFilter,      setStatusFilter]      = useState<'all' | 'unfilled' | 'filled'>('all');

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
    const evConfig = parseEventConfig(e);

    // Search query
    const matchSearch = !searchFilter.trim() ||
      e.nama_event.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (e.deskripsi && e.deskripsi.toLowerCase().includes(searchFilter.toLowerCase()));

    // Category filter
    let matchCategory = true;
    if (categoryFilter === 'form') {
      matchCategory = evConfig.is_qr_enabled === false;
    } else if (categoryFilter === 'event') {
      matchCategory = evConfig.is_qr_enabled !== false;
    }

    // Status filter (when logged in)
    let matchStatus = true;
    if (member) {
      const isFilled = memberAbsensiMap[e.id]?.is_form_filled;
      if (statusFilter === 'unfilled') matchStatus = !isFilled;
      if (statusFilter === 'filled')   matchStatus = !!isFilled;
    }

    return matchSearch && matchCategory && matchStatus;
  });

  const totalEvents   = events?.length || 0;
  const attendedCount = Object.values(memberAbsensiMap).filter(
    (a) => a.is_form_filled || a.is_qr_scanned
  ).length;
  const feedbackCount = Object.keys(memberFeedbackMap).length;

  return (
    <main className="min-h-[100dvh] animated-bg text-white relative overflow-hidden">
      {/* Background Decorative Tech Blobs */}
      <div className="fixed w-96 h-96 rounded-full bg-blue-600/10 top-0 left-0 -translate-x-1/3 -translate-y-1/3 blur-3xl pointer-events-none z-0" />
      <div className="fixed w-80 h-80 rounded-full bg-amber-500/8 bottom-0 right-0 translate-x-1/4 translate-y-1/4 blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* ── MEMBER PROFILE / ACCESS HEADER BAR ── */}
        <div className="tech-card p-5 sm:p-7 border border-blue-500/25 shadow-2xl slide-up">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            {member ? (
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 border-2 border-blue-400/40 flex items-center justify-center text-white font-extrabold text-2xl shrink-0 shadow-lg">
                  {member.nama.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-extrabold text-base sm:text-lg truncate tracking-tight">{member.nama}</h2>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full badge-open font-bold uppercase tracking-wider">
                      <CheckCircle size={11} weight="fill" />
                      Mahasiswa IT 26
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-mono mt-0.5">
                    NRP: <span className="text-[#ffc878] font-bold">{member.nrp}</span> • <span className="text-blue-300">{member.program_studi}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div className="w-12 h-12 rounded-2xl bg-white p-1.5 border-2 border-blue-500/40 flex items-center justify-center shrink-0 glow-blue shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/favicon.ico"
                    alt="Logo IT 26"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Portal Layanan &amp; Formulir IT 2026</p>
                  <p className="text-slate-400 text-xs">Masuk menggunakan NRP untuk mengisi formulir pendataan &amp; kegiatan</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              {member ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordModal(true)}
                    className="flex-1 md:flex-none inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600/60 text-slate-200 text-xs font-bold transition-all shadow"
                  >
                    <Key size={14} weight="bold" />
                    Ganti Password
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
                  <Key size={14} weight="bold" />
                  Masuk Mahasiswa
                  <ArrowRight size={14} weight="bold" />
                </Link>
              )}
            </div>
          </div>

          {/* Member KPI Summary Statistics (When Logged in) */}
          {member && (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-5 mt-5 border-t border-slate-800">
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                <p className="text-slate-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Formulir Tersedia</p>
                <p className="text-lg sm:text-2xl font-extrabold text-white mt-0.5">{totalEvents}</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-blue-950/40 border border-blue-500/25 text-center">
                <p className="text-blue-300 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Sudah Diisi</p>
                <p className="text-lg sm:text-2xl font-extrabold text-[#c8dcff] mt-0.5">{attendedCount}</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-amber-950/30 border border-amber-500/25 text-center">
                <p className="text-amber-300 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Ulasan / Feedback</p>
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
              alt="Logo IT 26"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full badge-tech-blue text-xs font-bold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Portal Formulir &amp; Kegiatan Terpadu
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            PORTAL FORMULIR <span className="gradient-text-ifest">IT 2026</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Satu portal terpadu untuk pendataan angkatan, registrasi lomba, survey kuesioner, dan kegiatan mahasiswa S1 Teknologi Informasi Angkatan 2026.
          </p>
        </div>

        {/* ── EVENTS SEARCH & CATEGORY FILTER ── */}
        <div className="slide-up space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white font-extrabold text-base tracking-tight">
              <CalendarBlank size={20} weight="bold" className="text-[#ffc878]" />
              Daftar Formulir &amp; Kegiatan
              <span className="text-xs px-2.5 py-0.5 rounded-full badge-tech-amber font-mono font-bold">
                {filteredEvents.length}
              </span>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari formulir atau kegiatan..."
                aria-label="Cari formulir atau kegiatan"
                className="input-glow w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="inline-flex p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs gap-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua ({events?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('form')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  categoryFilter === 'form'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📝 Pendataan &amp; Lomba
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('event')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  categoryFilter === 'event'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎟️ Kegiatan &amp; Tiket QR
              </button>
            </div>

            {member && (
              <div className="inline-flex p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua Status
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('unfilled')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                    statusFilter === 'unfilled'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Belum Diisi
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('filled')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                    statusFilter === 'filled'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sudah Diisi
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="tech-card p-6 text-center text-red-400 border border-red-500/30">
              <p>Gagal memuat daftar formulir. Silakan muat ulang halaman.</p>
            </div>
          )}

          {!error && filteredEvents.length === 0 && (
            <div className="tech-card p-12 text-center border border-slate-800">
              <Tray size={52} className="mx-auto mb-3 text-slate-600 float-anim" weight="regular" />
              <h3 className="text-white font-bold text-base mb-1">
                Belum Ada Formulir Ditemukan
              </h3>
              <p className="text-slate-400 text-xs">
                {searchFilter ? 'Coba cari dengan kata kunci lain.' : 'Pantau terus! Formulir atau kegiatan baru akan muncul di sini.'}
              </p>
            </div>
          )}

          {filteredEvents.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredEvents.map((event: Event, idx: number) => {
                const evConfig = parseEventConfig(event);
                const cleanDesc = cleanEventDeskripsi(event.deskripsi);
                const targetUrl = member ? `/event/${event.id}` : '/login';
                const memberAbs = memberAbsensiMap[event.id];
                const memberFb  = memberFeedbackMap[event.id];
                const isFormTypeOnly = evConfig.is_qr_enabled === false && evConfig.is_feedback_enabled === false;

                return (
                  <div
                    key={event.id}
                    className="tech-card tech-card-hover p-6 flex flex-col justify-between space-y-4 border border-blue-500/20"
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="badge-open inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Aktif
                          </span>
                          {evConfig.is_qr_enabled === false ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              📝 Formulir / Pendataan
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-[#ffc878] border border-amber-500/30">
                              🎟️ Kegiatan &amp; Tiket
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(event.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>

                      <h3 className="text-white font-extrabold text-lg sm:text-xl leading-snug tracking-tight hover:text-blue-300 transition-colors">
                        {event.nama_event}
                      </h3>

                      {cleanDesc && (
                        <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed whitespace-pre-line">
                          {cleanDesc}
                        </p>
                      )}

                      {/* Logged in member status badges */}
                      {member && (
                        isFormTypeOnly ? (
                          <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                            memberAbs?.is_form_filled
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}>
                            <NotePencil size={15} weight={memberAbs?.is_form_filled ? 'fill' : 'regular'} />
                            <span>{memberAbs?.is_form_filled ? '✓ Respon Formulir Telah Terkirim' : 'Belum Mengisi Formulir Ini'}</span>
                          </div>
                        ) : (
                          <div className={`grid ${evConfig.is_feedback_enabled ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 pt-3 pb-1 border-t border-slate-800`}>
                            <div className={`p-2 rounded-xl text-center border text-[10px] font-bold flex flex-col items-center gap-1 ${
                              memberAbs?.is_form_filled
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : 'bg-slate-900/60 border-slate-800 text-slate-500'
                            }`}>
                              <NotePencil size={14} weight={memberAbs?.is_form_filled ? 'fill' : 'regular'} />
                              {memberAbs?.is_form_filled ? 'Form Terisi' : 'Form Belum'}
                            </div>

                            {evConfig.is_qr_enabled && (
                              <div className={`p-2 rounded-xl text-center border text-[10px] font-bold flex flex-col items-center gap-1 ${
                                memberAbs?.is_qr_scanned
                                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
                              }`}>
                                <DeviceMobile size={14} weight={memberAbs?.is_qr_scanned ? 'fill' : 'regular'} />
                                {memberAbs?.is_qr_scanned ? 'QR Discan' : 'Tiket Siap'}
                              </div>
                            )}

                            {evConfig.is_feedback_enabled && (
                              <div className={`p-2 rounded-xl text-center border text-[10px] font-bold flex flex-col items-center gap-1 ${
                                memberFb
                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
                              }`}>
                                <Star size={14} weight={memberFb ? 'fill' : 'regular'} />
                                {memberFb ? 'Ulasan OK' : 'Ulasan Belum'}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    <Link
                      href={targetUrl}
                      className="w-full btn-primary h-12 text-xs uppercase tracking-wider font-bold shadow-md rounded-xl"
                    >
                      <span>
                        {member
                          ? evConfig.is_qr_enabled === false
                            ? (memberAbs?.is_form_filled ? 'Lihat / Ubah Jawaban Formulir' : 'Isi Formulir Sekarang')
                            : 'Buka Formulir & Tiket QR'
                          : 'Masuk untuk Mengisi Formulir'}
                      </span>
                      <ArrowRight size={14} weight="bold" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer className="text-center text-xs text-slate-500 pt-8 border-t border-slate-800/80 space-y-1">
          <p className="font-semibold text-slate-400">© 2026 Mahasiswa S1 Teknologi Informasi · PORTAL IT 26</p>
        </footer>
      </div>
    </main>
  );
}
