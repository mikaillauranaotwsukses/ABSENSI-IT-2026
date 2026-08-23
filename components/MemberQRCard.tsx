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
    <div className="glass-card rounded-2xl p-6 sm:p-8 slide-up text-center max-w-md mx-auto relative overflow-hidden border border-indigo-500/30">
      {/* Decorative top gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500" />

      {/* Header */}
      <div className="mb-6 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
          🎫 Tiket Absensi Anggota
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{event.nama_event}</h2>
        <p className="text-slate-400 text-xs">Tunjukkan QR Code ini kepada Panitia di Lokasi Acara</p>
      </div>

      {/* QR Code Container */}
      <div className="bg-white p-5 rounded-2xl inline-block shadow-2xl mx-auto mb-6 relative group">
        <QRCodeSVG
          value={qrData}
          size={200}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: '/favicon.ico',
            x: undefined,
            y: undefined,
            height: 32,
            width: 32,
            excavate: true,
          }}
        />
      </div>

      {/* Member Details */}
      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 mb-6 text-left space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Nama Lengkap:</span>
          <span className="text-white font-bold">{member.nama}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">NRP:</span>
          <span className="text-indigo-300 font-mono font-bold">{member.nrp}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Program Studi:</span>
          <span className="text-slate-200">{member.program_studi}</span>
        </div>
      </div>

      {/* Scan Status Badge */}
      <div className="p-3.5 rounded-xl border flex items-center justify-between transition-all text-xs font-medium">
        <span className="text-slate-300">Status Check-in Panitia:</span>
        {isScanned ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 font-bold">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Sudah Scan QR
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/50">
            ⏳ Belum Scan QR
          </span>
        )}
      </div>

      {isScanned && absensi?.qr_scanned_at && (
        <p className="text-[11px] text-slate-500 mt-2">
          Discan pada {new Date(absensi.qr_scanned_at).toLocaleString('id-ID', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
          })}
        </p>
      )}
    </div>
  );
}
