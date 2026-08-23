'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Html5Qrcode } from 'html5-qrcode';
import { Event } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminScanQRPage() {
  const supabase = createClient();

  const [events,           setEvents]           = useState<Event[]>([]);
  const [selectedEvent,    setSelectedEvent]    = useState<string>('');
  const [inputNrp,         setInputNrp]         = useState('');
  const [loading,          setLoading]          = useState(false);
  const [isCameraActive,   setIsCameraActive]   = useState(false);
  const [cameraError,      setCameraError]      = useState('');

  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    nama?: string;
    nrp?: string;
    prodi?: string;
    message?: string;
  } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Load events
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
  }, [supabase]);

  // Clean up camera scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch((e) => console.warn(e));
      }
    };
  }, []);

  // Process Check-in via API Route
  const handleCheckIn = async (rawCode: string) => {
    if (!selectedEvent) {
      alert('Pilih event terlebih dahulu.');
      return;
    }
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setLoading(true);
    setLastScanResult(null);

    let scannedNrp = rawCode.trim();
    let scannedEventId = selectedEvent;

    // Try parsing if QR code contains JSON
    try {
      if (rawCode.startsWith('{')) {
        const parsed = JSON.parse(rawCode);
        if (parsed.nrp) scannedNrp = parsed.nrp;
        if (parsed.event_id) scannedEventId = parsed.event_id;
      }
    } catch (e) {
      console.warn('QR data is raw string:', rawCode);
    }

    try {
      const res = await fetch('/api/admin/scan-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: scannedEventId, nrp: scannedNrp }),
      });

      const data = await res.json();
      setLastScanResult(data);

      if (data.success) {
        setInputNrp('');
        // Play success audio beep / vibration feedback
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(200);
        }
      }
    } catch (err: any) {
      setLastScanResult({
        success: false,
        message: err?.message || 'Terjadi kesalahan koneksi server.',
      });
    } finally {
      setLoading(false);
      // Wait 2.5s before allowing next scan
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2500);
    }
  };

  // Toggle Live Camera Scanner
  const startCamera = async () => {
    setCameraError('');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
      }

      setIsCameraActive(true);

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' }, // Preferred back camera on phones
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleCheckIn(decodedText);
        },
        (errorMessage) => {
          // parse error, ignore continuously
        }
      );
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError('Gagal membuka kamera: ' + (err?.message || 'Pastikan Anda memberikan izin kamera pada browser HP.'));
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
    } else {
      setIsCameraActive(false);
    }
  };

  return (
    <main className="min-h-screen animated-bg text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/portal-it-admin"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs font-medium transition-colors"
          >
            ← Kembali ke Dashboard
          </Link>
          <span className="text-xs text-indigo-400 font-mono font-semibold">
            Scanner QR Panitia
          </span>
        </div>

        {/* Title Card */}
        <div className="glass rounded-2xl p-6 text-center border border-indigo-500/30 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-3xl mx-auto mb-3 glow-indigo">
            📷
          </div>
          <h1 className="text-2xl font-bold text-white">Scanner QR Absensi Panitia</h1>
          <p className="text-slate-400 text-xs mt-1">
            Scan langsung menggunakan kamera HP/Laptop Anda atau masukkan NRP anggota.
          </p>

          {/* Event Selector */}
          <div className="mt-5 text-left">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Pilih Event Aktif:
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-600/50 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 focus:outline-none"
            >
              {events.length === 0 ? (
                <option value="">Tidak ada event aktif</option>
              ) : (
                events.map((e) => (
                  <option key={e.id} value={e.id}>{e.nama_event}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Live Camera Scanner Box */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border border-indigo-500/20 text-center">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span>📹</span> Kamera Scanner Langsung
            </h3>
            <button
              type="button"
              onClick={isCameraActive ? stopCamera : startCamera}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isCameraActive
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white glow-indigo'
              }`}
            >
              {isCameraActive ? '🛑 Matikan Kamera' : '📷 Aktifkan Kamera HP/Webcam'}
            </button>
          </div>

          {/* Camera Scanner Viewport Container */}
          <div className={`relative overflow-hidden rounded-2xl border ${isCameraActive ? 'border-indigo-500/50 bg-black' : 'border-slate-700/50 bg-slate-900/60 p-8'}`}>
            <div id="qr-reader-container" className="w-full mx-auto" />
            {!isCameraActive && (
              <div className="py-6 text-slate-400 text-xs">
                <div className="text-4xl mb-2">📷</div>
                <p>Klik tombol <strong>"Aktifkan Kamera HP/Webcam"</strong> di atas untuk memindai QR secara langsung melalui kamera.</p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
              {cameraError}
            </div>
          )}
        </div>

        {/* Manual Input Fallback */}
        <div className="glass-card rounded-2xl p-6 space-y-3 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span>⌨️</span> Input NRP Manual / Barcode Scanner Fisik
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputNrp.trim()) handleCheckIn(inputNrp);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputNrp}
              onChange={(e) => setInputNrp(e.target.value)}
              placeholder="Masukkan NRP anggota (contoh: C14230001)..."
              className="input-glow flex-1 bg-slate-800/80 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !inputNrp.trim()}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all disabled:opacity-50 shrink-0"
            >
              {loading ? 'Check-in...' : 'Check-in'}
            </button>
          </form>
        </div>

        {/* Scan Result Toast Banner */}
        {lastScanResult && (
          <div
            className={`p-6 rounded-2xl border slide-up text-center shadow-2xl ${
              lastScanResult.success
                ? 'bg-green-500/15 border-green-500/40 text-green-300'
                : 'bg-red-500/15 border-red-500/40 text-red-300'
            }`}
          >
            <div className="text-4xl mb-3">
              {lastScanResult.success ? '✅' : '❌'}
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {lastScanResult.success ? 'CHECK-IN BERHASIL!' : 'CHECK-IN GAGAL!'}
            </h3>
            {lastScanResult.success ? (
              <div>
                <p className="text-green-300 font-semibold text-base">{lastScanResult.nama}</p>
                <p className="text-slate-300 text-xs font-mono">{lastScanResult.nrp} • {lastScanResult.prodi}</p>
                <span className="inline-block mt-3 px-3.5 py-1 rounded-full bg-green-500/30 text-green-200 border border-green-400/40 text-xs font-bold">
                  ✓ Status: Sudah Scan QR
                </span>
              </div>
            ) : (
              <p className="text-red-400 text-xs">{lastScanResult.message}</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
