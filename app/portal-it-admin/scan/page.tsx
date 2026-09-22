'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Html5Qrcode } from 'html5-qrcode';
import { Event } from '@/lib/types';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  IdentificationCard, User, Camera, CameraSlash, Keyboard,
  CheckCircle, X, ArrowLeft, Warning,
} from '@phosphor-icons/react';

export const dynamic = 'force-dynamic';

// ── Tipe data ───────────────────────────────────────────────
interface ScanResult {
  success: boolean;
  nama?: string;
  nrp?: string;
  prodi?: string;
  message?: string;
}

interface PendingConfirm {
  rawCode: string;
  scannedNrp: string;
  scannedEventId: string;
  anggotaNama?: string;
  anggotaProdi?: string;
}

// ── Komponen Modal Konfirmasi ────────────────────────────────
function ConfirmModal({
  pending,
  loading,
  onConfirm,
  onCancel,
}: {
  pending: PendingConfirm;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
         style={{ background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="tech-card rounded-3xl p-8 max-w-sm w-full border border-blue-500/40 shadow-2xl text-center slide-up">
        {/* Ikon & Header */}
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mx-auto mb-4">
          <IdentificationCard size={32} weight="bold" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Konfirmasi Check-in</h2>
        <p className="text-slate-400 text-xs mb-6">Apakah anggota berikut akan dikonfirmasi hadir?</p>

        {/* Info Anggota */}
        <div className="bg-slate-900/80 rounded-2xl p-4 mb-6 border border-slate-700/60 text-left space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0">
              <User size={20} weight="bold" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">
                {pending.anggotaNama || pending.scannedNrp}
              </p>
              <p className="text-slate-400 text-xs font-mono">{pending.scannedNrp}</p>
              {pending.anggotaProdi && (
                <p className="text-blue-300 text-xs font-medium">{pending.anggotaProdi}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl border border-slate-600/50 text-slate-300 text-sm font-semibold hover:bg-slate-700/50 transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </span>
            ) : 'Konfirmasi Hadir'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Halaman Utama ────────────────────────────────────────────
export default function AdminScanQRPage() {
  const supabase = createClient();

  const [events,         setEvents]         = useState<Event[]>([]);
  const [selectedEvent,  setSelectedEvent]  = useState<string>('');
  const [inputNrp,       setInputNrp]       = useState('');
  const [loading,        setLoading]        = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError,    setCameraError]    = useState('');
  const [lastResult,     setLastResult]     = useState<ScanResult | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [lookupLoading,  setLookupLoading]  = useState(false);

  const html5QrCodeRef  = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Load event aktif
  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabase
        .from('event')
        .select('*')
        .eq('status', true)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setEvents(data as Event[]);
        setSelectedEvent(data[0].id);
      }
    }
    loadEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // ── Parse QR code & lookup anggota → tampilkan modal ──────
  const handleScannedCode = useCallback(async (rawCode: string) => {
    if (!selectedEvent) { alert('Pilih event terlebih dahulu.'); return; }
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    let scannedNrp      = rawCode.trim();
    let scannedEventId  = selectedEvent;

    try {
      if (rawCode.startsWith('{')) {
        const parsed = JSON.parse(rawCode);
        if (parsed.nrp)      scannedNrp     = parsed.nrp;
        if (parsed.event_id) scannedEventId = parsed.event_id;
      }
    } catch { /* raw NRP string */ }

    // Lookup nama anggota untuk ditampilkan di modal
    setLookupLoading(true);
    const { data: anggota } = await supabase
      .from('anggota')
      .select('nama, program_studi')
      .eq('nrp', scannedNrp)
      .maybeSingle();
    setLookupLoading(false);

    // Pause kamera & tampilkan modal konfirmasi
    setPendingConfirm({
      rawCode,
      scannedNrp,
      scannedEventId,
      anggotaNama:  anggota?.nama,
      anggotaProdi: anggota?.program_studi,
    });
  }, [selectedEvent, supabase]);

  // ── Eksekusi Check-in setelah admin konfirmasi ─────────────
  const doCheckIn = async () => {
    if (!pendingConfirm) return;
    setLoading(true);

    try {
      const res = await fetch('/api/admin/scan-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: pendingConfirm.scannedEventId,
          nrp:      pendingConfirm.scannedNrp,
        }),
      });
      const data: ScanResult = await res.json();
      setLastResult(data);

      if (data.success && 'vibrate' in navigator) navigator.vibrate(200);
    } catch (err: any) {
      setLastResult({ success: false, message: err?.message || 'Kesalahan koneksi server.' });
    } finally {
      setLoading(false);
      setPendingConfirm(null);
      setInputNrp('');
      // Izinkan scan berikutnya setelah 3 detik
      setTimeout(() => { isProcessingRef.current = false; }, 3000);
    }
  };

  // ── Batal dari modal ───────────────────────────────────────
  const cancelConfirm = () => {
    setPendingConfirm(null);
    isProcessingRef.current = false;
  };

  // ── Kamera ────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError('');
    setLastResult(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
      }
      setIsCameraActive(true);
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => { handleScannedCode(decodedText); },
        () => {}
      );
    } catch (err: any) {
      setCameraError('Gagal membuka kamera: ' + (err?.message || 'Berikan izin kamera pada browser.'));
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current?.isScanning) {
      try { await html5QrCodeRef.current.stop(); } catch { /* ignore */ }
    }
    setIsCameraActive(false);
  };

  // ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-[100dvh] animated-bg text-white p-3.5 sm:p-6 md:p-8 overflow-x-hidden max-w-full">
      <div className="max-w-2xl w-full mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/portal-it-admin" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-medium transition-colors">
            <ArrowLeft size={14} weight="bold" /> Kembali ke Dashboard
          </Link>
          <span className="text-xs text-blue-400 font-mono font-semibold">Scanner QR Panitia</span>
        </div>

        {/* Title */}
        <div className="tech-card rounded-2xl p-5 sm:p-6 text-center border border-blue-500/30 shadow-2xl">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-3">
            <Camera size={26} weight="bold" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Scanner QR Absensi Panitia</h1>
          <p className="text-slate-400 text-xs mt-1">
            Scan QR anggota • Konfirmasi kehadiran • Catat otomatis
          </p>

          {/* Event Selector */}
          <div className="mt-4 text-left">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Pilih Event Aktif:</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 sm:py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              {events.length === 0
                ? <option value="">Tidak ada event aktif</option>
                : events.map((e) => <option key={e.id} value={e.id}>{e.nama_event}</option>)
              }
            </select>
          </div>
        </div>

        {/* Kamera Scanner */}
        <div className="tech-card rounded-2xl p-4 sm:p-6 space-y-4 border border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Camera size={16} weight="bold" className="text-blue-400" /> Kamera Scanner Langsung
            </h3>
            <button
              type="button"
              onClick={isCameraActive ? stopCamera : startCamera}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isCameraActive
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'btn-primary'
              }`}
            >
              {isCameraActive
                ? <><CameraSlash size={14} weight="bold" /> Matikan Kamera</>
                : <><Camera size={14} weight="bold" /> Aktifkan Kamera</>
              }
            </button>
          </div>

          <div className={`relative overflow-hidden rounded-2xl border max-w-full ${
            isCameraActive ? 'border-blue-500/50 bg-black' : 'border-slate-700/50 bg-slate-900/60'
          }`}>
            <div id="qr-reader-container" className="w-full max-w-full mx-auto" />
            {!isCameraActive && (
              <div className="py-8 sm:py-10 text-center text-slate-400 text-xs px-4">
                <Camera size={40} weight="regular" className="mx-auto mb-2 text-slate-600" />
                <p>Klik <strong>&quot;Aktifkan Kamera&quot;</strong> untuk memindai QR anggota secara langsung.</p>
              </div>
            )}
          </div>

          {lookupLoading && (
            <div className="flex items-center gap-2 text-blue-300 text-xs justify-center py-2">
              <span className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              Memvalidasi QR Code...
            </div>
          )}

          {cameraError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
              {cameraError}
            </div>
          )}
        </div>

        {/* Input Manual */}
        <div className="tech-card rounded-2xl p-4 sm:p-6 space-y-3 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Keyboard size={16} weight="bold" className="text-slate-400" /> Input NRP Manual / Barcode Scanner Fisik
            </h3>
          <form
            onSubmit={(e) => { e.preventDefault(); if (inputNrp.trim()) handleScannedCode(inputNrp); }}
            className="flex flex-col sm:flex-row gap-2 w-full"
          >
            <input
              type="text"
              value={inputNrp}
              onChange={(e) => setInputNrp(e.target.value)}
              placeholder="Masukkan NRP anggota (contoh: 5027261001)..."
              className="input-glow flex-1 min-w-0 w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-2.5 sm:py-3 text-white placeholder-slate-500 text-sm focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !inputNrp.trim()}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl btn-primary text-xs uppercase font-bold tracking-wider transition-all disabled:opacity-50 shrink-0"
            >
              Check-in
            </button>
          </form>
        </div>

        {/* Hasil Terakhir */}
        {lastResult && (
          <div className={`p-5 sm:p-6 rounded-2xl border slide-up text-center shadow-2xl ${
            lastResult.success
              ? 'bg-green-500/15 border-green-500/40'
              : 'bg-red-500/15 border-red-500/40'
          }`}>
            {lastResult.success
              ? <CheckCircle size={40} weight="fill" className={`mx-auto mb-2 sm:mb-3 ${lastResult.success ? 'text-green-400' : 'text-red-400'}`} />
              : <X size={40} weight="bold" className="mx-auto mb-2 sm:mb-3 text-red-400" />
            }
            <h3 className="text-base sm:text-lg font-bold text-white mb-1">
              {lastResult.success ? 'CHECK-IN BERHASIL!' : 'CHECK-IN GAGAL!'}
            </h3>
            {lastResult.success ? (
              <div>
                <p className="text-green-300 font-semibold text-sm sm:text-base">{lastResult.nama}</p>
                <p className="text-slate-300 text-xs font-mono">{lastResult.nrp} • {lastResult.prodi}</p>
                <span className="inline-block mt-3 px-3.5 py-1 rounded-full bg-green-500/30 text-green-200 border border-green-400/40 text-xs font-bold">
                  ✓ Status: Sudah Scan QR
                </span>
              </div>
            ) : (
              <p className="text-red-400 text-xs">{lastResult.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi — muncul saat QR terdeteksi */}
      {mounted && pendingConfirm && (
        <ConfirmModal
          pending={pendingConfirm}
          loading={loading}
          onConfirm={doCheckIn}
          onCancel={cancelConfirm}
        />
      )}
    </main>
  );
}
