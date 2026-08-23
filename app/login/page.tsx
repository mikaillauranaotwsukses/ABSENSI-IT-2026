'use client';

import { useState } from 'react';
import { useMemberAuth } from '@/lib/context/MemberAuthContext';
import { useRouter } from 'next/navigation';

export default function MemberLoginPage() {
  const { loginMember, member } = useMemberAuth();
  const router = useRouter();

  const [nrp,      setNrp]      = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState(false);

  // If already logged in, redirect to home
  if (member && !member.must_change_password) {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await loginMember(nrp, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Login gagal.');
    } else if (!res.mustChangePassword) {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen animated-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="blob w-96 h-96 bg-indigo-700 -top-24 -left-24" />
      <div className="blob w-80 h-80 bg-purple-700 bottom-0 right-0 translate-x-1/4 translate-y-1/4" />

      <div className="relative z-10 w-full max-w-md scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white p-2.5 flex items-center justify-center mx-auto mb-4 border border-white/40 shadow-2xl shadow-indigo-500/30 glow-indigo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.ico"
              alt="Logo Absensi IT 26"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Login Anggota IT 26</h1>
          <p className="text-slate-400 text-sm mt-1">Masukkan NRP dan Password Anda untuk mengakses absensi</p>
        </div>

        {/* Form Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                NRP Anggota <span className="text-red-400">*</span>
              </label>
              <input
                id="member-nrp"
                type="text"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                required
                placeholder="Masukkan NRP (contoh: C14230001)..."
                className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="member-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password Anda..."
                  className="input-glow w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                💡 Password bawaan pertama kali adalah <span className="text-indigo-300 font-mono">NRP Anda</span> atau <span className="text-indigo-300 font-mono">absensi2026</span>.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all glow-indigo disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memverifikasi...
                </span>
              ) : (
                'Masuk ke Portal Absensi'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
