'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Event, Anggota, Absensi } from '@/lib/types';

interface Props {
  event: Event;
  member: Anggota;
  absensi: Absensi | null;
}

export default function MemberQRCard({ event, member, absensi }: Props) {
  const qrData = JSON.stringify({
    event_id: event.id,
    nrp: member.nrp,
  });

  const isScanned = !!absensi?.is_qr_scanned;

  return (
    <div className="max-w-md mx-auto slide-up">
      {/* Digital Festival Pass Container */}
      <div className="relative rounded-3xl bg-[#101728] border-2 border-blue-500/30 overflow-hidden shadow-2xl glow-blue">
        {/* Top Header Ticket Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-5 text-center text-white relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/25 backdrop-blur-md border border-white/20 text-[#ffc878] text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
            <span>⚡</span> OFFICIAL DIGITAL EVENT PASS
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
            {event.nama_event}
          </h2>
          <p className="text-blue-200 text-xs mt-1">
            IT 2026 Participation Identity
          </p>

          {/* Ticket barcode accent strip */}
          <div className="mt-3 pt-2 border-t border-white/15 flex justify-between items-center text-[10px] font-mono text-blue-200/80">
            <span>CODE: {event.id.slice(0, 8).toUpperCase()}</span>
            <span>PASS #2026</span>
          </div>
        </div>

        {/* Notches for ticket effect */}
        <div className="relative flex items-center justify-between px-2 -my-3 z-20">
          <div className="w-6 h-6 rounded-full bg-[#090d16] -ml-5 border-r border-blue-500/40" />
          <div className="flex-1 border-t-2 border-dashed border-slate-700 mx-2" />
          <div className="w-6 h-6 rounded-full bg-[#090d16] -mr-5 border-l border-blue-500/40" />
        </div>

        {/* Pass Body */}
        <div className="p-6 text-center space-y-5">
          {/* QR Code Frame */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl inline-block shadow-2xl border-4 border-slate-200/80 mx-auto relative group">
            <QRCodeSVG
              value={qrData}
              size={190}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: '/favicon.ico',
                x: undefined,
                y: undefined,
                height: 36,
                width: 36,
                excavate: true,
              }}
            />
          </div>

          <p className="text-slate-400 text-xs font-medium">
            Tunjukkan QR Code ini ke Panitia untuk pemindaian presensi di lokasi acara.
          </p>

          {/* Participant Tech ID Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Nama Lengkap:</span>
              <span className="text-white font-bold">{member.nama}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">NRP Anggota:</span>
              <span className="text-[#ffc878] font-mono font-bold">{member.nrp}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Program Studi:</span>
              <span className="text-slate-200 font-medium">{member.program_studi}</span>
            </div>
          </div>

          {/* Realtime Check-in Status */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Status Presensi di Tempat:</span>
            {isScanned ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full badge-open font-bold text-[11px]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                ✓ Sudah Hadir / Discan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full badge-tech-amber font-semibold text-[11px]">
                <span>⏳</span> Belum Discan
              </span>
            )}
          </div>

          {isScanned && absensi?.qr_scanned_at && (
            <p className="text-[11px] text-emerald-400/90 font-mono">
              Waktu Check-in: {new Date(absensi.qr_scanned_at).toLocaleString('id-ID', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })} WIB
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
