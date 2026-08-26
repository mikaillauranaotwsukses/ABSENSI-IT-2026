'use client';

import { useState } from 'react';
import { useMemberAuth } from '@/lib/context/MemberAuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    <main className="min-h-screen animated-bg flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background Tech Orbs */}
      <div className="blob w-96 h-96 bg-blue-600/20 -top-24 -left-24 pointer-events-none" />
      <div className="blob w-80 h-80 bg-amber-500/15 bottom-0 right-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md scale-in space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-2xl bg-white p-2.5 flex items-center justify-center mx-auto border-2 border-blue-500/30 shadow-2xl glow-blue transition-transform hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.ico"
              alt="Logo Absensi IT 26"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full badge-tech-blue text-[11px] font-bold tracking-wider uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Member Access Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Portal Anggota <span className="gradient-text-ifest">IT 2026</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto mt-1">
              Masuk menggunakan NRP & Password untuk mengakses tiket QR dan formulir acara.
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="tech-card p-6 sm:p-8 shadow-2xl border border-blue-500/20">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                NRP Anggota <span className="text-red-400">*</span>
              </label>
              <input
                id="member-nrp"
                type="text"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                required
                placeholder="Contoh: 5027261001"
                className="input-glow w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password <span className="text-red-400">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  id="member-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Masukkan password Anda..."
                  className="input-glow w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all pr-11 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                  title={showPass ? 'Sembunyikan' : 'Tampilkan'}
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
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 fade-in">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              id="member-submit"
              type="submit"
              disabled={loading}
              className="w-full btn-primary h-12 text-sm uppercase tracking-wider font-bold rounded-xl mt-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memverifikasi...
                </span>
              ) : (
                'Masuk ke Portal →'
              )}
            </button>
          </form>

          {/* Quick instructions box */}
          <div className="mt-6 pt-4 border-t border-slate-700/50 text-[11px] text-slate-400 space-y-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span>💡</span> Informasi Login Pertama:
            </p>
            <p>• Masukkan NRP Anda yang terdaftar.</p>
            <p>• Password awal: <strong>12345678</strong> (Anda akan diminta membuat sandi baru saat pertama kali masuk).</p>
          </div>
        </div>

        {/* Admin Link */}
        <div className="text-center">
          <Link
            href="/portal-it-admin/login"
            className="text-xs text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 font-medium"
          >
            <span>🔐</span> Masuk sebagai Admin Panitia →
          </Link>
        </div>
      </div>
    </main>
  );
}
