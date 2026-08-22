'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props {
  eventId: string;
  eventName: string;
  redirectAfter?: string; // where to go after delete
}

export default function DeleteEventButton({ eventId, eventName, redirectAfter = '/portal-it-admin/events' }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inputName, setInputName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from('event').delete().eq('id', eventId);
    if (error) {
      alert('Gagal menghapus event: ' + error.message);
      setDeleting(false);
    } else {
      router.push(redirectAfter);
      router.refresh();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/25 border border-red-500/25 hover:border-red-500/50 text-red-400 hover:text-red-300 text-xs font-medium transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        Hapus
      </button>

      {/* Confirmation modal rendered via Portal to avoid CSS transform/blur clipping */}
      {showConfirm && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !deleting && setShowConfirm(false)}
          />
          {/* Modal */}
          <div className="relative glass rounded-2xl p-6 w-full max-w-md scale-in z-10 shadow-2xl border border-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center text-xl shrink-0">
                🗑️
              </div>
              <div>
                <h3 className="font-bold text-white">Hapus Event</h3>
                <p className="text-slate-400 text-sm">Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-5 text-sm text-slate-300">
              Semua data absensi pada event <span className="font-semibold text-white">&quot;{eventName}&quot;</span> akan terhapus permanen.
            </div>

            <p className="text-xs text-slate-400 mb-2">
              Ketik nama event untuk konfirmasi:
              <span className="text-white font-mono ml-1">{eventName}</span>
            </p>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Ketik nama event..."
              className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-sm transition-all mb-4"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setInputName(''); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-600/50 text-slate-300 hover:text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || inputName.trim() !== eventName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Menghapus...
                  </span>
                ) : (
                  'Hapus Event'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
