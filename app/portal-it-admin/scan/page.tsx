'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Event, Anggota } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminScanQRPage() {
  const supabase = createClient();

  const [events,        setEvents]        = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [inputNrp,      setInputNrp]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    nama?: string;
    nrp?: string;
    prodi?: string;
    message?: string;
  } | null>(null);

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

  // Process QR code data (string formatted as JSON or raw NRP)
  const processQrScan = async (rawCode: string) => {
    if (!selectedEvent) {
      alert('Pilih event terlebih dahulu.');
      return;
    }

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
      // 1. Verify Anggota exists
      const { data: anggota, error: errAnggota } = await supabase
        .from('anggota')
        .select('*')
        .eq('nrp', scannedNrp)
        .maybeSingle();

      if (errAnggota || !anggota) {
        setLastScanResult({
          success: false,
          message: `NRP "${scannedNrp}" tidak ditemukan dalam database anggota.`,
        });
        setLoading(false);
        return;
      }

      // 2. Fetch existing absensi record
      const { data: existing } = await supabase
        .from('absensi')
        .select('*')
        .eq('event_id', scannedEventId)
        .eq('nrp', scannedNrp)
        .maybeSingle();

      // 3. Mark as QR Scanned
      const { error: errUpsert } = await supabase.from('absensi').upsert(
        {
          ...(existing ? { id: existing.id } : {}),
          event_id:       scannedEventId,
          nrp:            scannedNrp,
          is_qr_scanned:  true,
          qr_scanned_at:  new Date().toISOString(),
          is_form_filled: existing?.is_form_filled ?? false,
          data_respons:   existing?.data_respons ?? {},
        },
        { onConflict: 'event_id, nrp' }
      );

      if (errUpsert) {
        setLastScanResult({
          success: false,
          message: 'Gagal update database: ' + errUpsert.message,
        });
      } else {
        setLastScanResult({
          success: true,
          nama: (anggota as Anggota).nama,
          nrp: (anggota as Anggota).nrp,
          prodi: (anggota as Anggota).program_studi,
          message: 'Berhasil Check-in via QR Code!',
        });
        setInputNrp('');
      }
    } catch (err: any) {
      setLastScanResult({
        success: false,
        message: err?.message || 'Terjadi kesalahan sistem.',
      });
    } finally {
      setLoading(false);
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
            Pilih event lalu scan QR Code tiket anggota atau masukkan NRP secara manual untuk check-in.
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

        {/* Input / Scanner Interface */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>⚡</span> Input / Scan QR Code
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputNrp.trim()) processQrScan(inputNrp);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputNrp}
              onChange={(e) => setInputNrp(e.target.value)}
              placeholder="Tempelkan hasil scan QR atau ketik NRP anggota..."
              className="input-glow flex-1 bg-slate-800/80 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !inputNrp.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all glow-indigo disabled:opacity-50 shrink-0"
            >
              {loading ? 'Check-in...' : 'Check-in'}
            </button>
          </form>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            💡 <strong>Petunjuk:</strong> Gunakan barcode/QR scanner fisik USB/Bluetooth atau salin hasil scan dari kamera HP.
          </p>
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
                <span className="inline-block mt-3 px-3 py-1 rounded-full bg-green-500/30 text-green-200 border border-green-400/40 text-xs font-bold">
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
