'use client';

import { useState } from 'react';
import { useMemberAuth } from '@/lib/context/MemberAuthContext';

export default function ChangePasswordModal() {
  const { member, showChangePasswordModal, setShowChangePasswordModal, changePassword } = useMemberAuth();

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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative glass rounded-2xl p-6 w-full max-w-md scale-in z-10 border border-indigo-500/30 shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-2xl mx-auto mb-3 glow-indigo">
            🔒
          </div>
          <h3 className="text-xl font-bold text-white">Wajib Ganti Password</h3>
          <p className="text-slate-400 text-xs mt-1">
            Halo <span className="text-indigo-300 font-semibold">{member.nama}</span>, demi keamanan akun, silakan buat password baru Anda sebelum melanjutkan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password Baru <span className="text-red-400">*</span>
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
              placeholder="Masukkan password baru..."
              className="input-glow w-full bg-slate-800/80 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Konfirmasi Password Baru <span className="text-red-400">*</span>
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
              placeholder="Ketik ulang password baru..."
              className="input-glow w-full bg-slate-800/80 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm"
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
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all glow-indigo disabled:opacity-50"
          >
            {loading ? 'Menyimpan Password...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  );
}
