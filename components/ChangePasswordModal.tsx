'use client';

import { useState } from 'react';
import { useMemberAuth } from '@/lib/context/MemberAuthContext';

export default function ChangePasswordModal() {
  const { member, showChangePasswordModal, changePassword } = useMemberAuth();

  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [showPass,    setShowPass]    = useState(false);

  if (!showChangePasswordModal || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPass.length < 4) {
      setError('Password minimal 4 karakter.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    const res = await changePassword(newPass);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal mengubah password.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" />
      <div className="relative tech-card p-6 sm:p-7 w-full max-w-md scale-in z-10 border border-blue-500/30 shadow-2xl space-y-4">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-2xl mx-auto glow-blue">
            🔐
          </div>
          <h3 className="text-xl font-extrabold text-white">Buat Password Baru</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Halo <span className="text-blue-300 font-bold">{member.nama}</span>, demi keamanan akun, silakan perbarui password awal Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Password Baru <span className="text-red-400">*</span>
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
              placeholder="Minimal 4 karakter..."
              className="input-glow w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Konfirmasi Password Baru <span className="text-red-400">*</span>
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
              placeholder="Ketik ulang password baru..."
              className="input-glow w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="hover:text-slate-200 transition-colors"
            >
              {showPass ? '🙈 Sembunyikan karakter' : '👁️ Tampilkan karakter'}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary h-12 text-sm font-bold uppercase tracking-wider rounded-xl mt-2 disabled:opacity-50"
          >
            {loading ? 'Menyimpan Sandi...' : 'Simpan & Masuk ke Dashboard →'}
          </button>
        </form>
      </div>
    </div>
  );
}
