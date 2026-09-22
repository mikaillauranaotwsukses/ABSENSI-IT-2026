'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Trash, Warning } from '@phosphor-icons/react';

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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/25 border border-red-500/25 hover:border-red-500/50 text-red-400 hover:text-red-300 text-xs font-medium transition-all"
      >
        <Trash size={13} weight="bold" />
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
              <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center shrink-0">
                <Trash size={20} weight="bold" className="text-red-400" />
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
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
