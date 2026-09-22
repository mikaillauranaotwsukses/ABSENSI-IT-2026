'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeSlash, Warning, ArrowRight, ShieldCheck } from '@phosphor-icons/react';

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  const supabase = createClient();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 8-second timeout guard to prevent infinite loading state
      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(
          () => reject(new Error('Koneksi timeout. Silakan periksa jaringan/koneksi Supabase Anda.')),
          8000
        )
      );

      const res = await Promise.race([
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
        timeoutPromise,
      ]);

      if (res.error) {
        if (res.error.message?.includes('Failed to fetch') || res.error.message?.includes('fetch')) {
          setError('Gagal terhubung ke Supabase. Periksa koneksi internet Anda atau coba lagi.');
        } else {
          setError(res.error.message || 'Email atau password salah. Silakan coba lagi.');
        }
        setLoading(false);
      } else {
        // Successful login: perform full browser redirect to send session cookies to server
        window.location.href = '/portal-it-admin';
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat login. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] animated-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Tech Orbs */}
      <div className="fixed w-96 h-96 rounded-full bg-blue-600/15 -top-24 -left-24 blur-3xl pointer-events-none z-0" />
      <div className="fixed w-80 h-80 rounded-full bg-amber-500/10 bottom-0 right-0 translate-x-1/4 translate-y-1/4 blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-md scale-in space-y-6">
        {/* Logo / Title */}
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
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Admin Portal IT
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Portal Admin <span className="gradient-text-ifest">IT 2026</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto mt-1">
              Dashboard Administrator &amp; Manajemen Absensi Acara
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="tech-card p-6 sm:p-8 shadow-2xl border border-blue-500/20">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Email Admin <span className="text-red-400">*</span>
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="input-glow w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input-glow w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all pr-11 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                  aria-label={showPass ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPass
                    ? <EyeSlash size={18} weight="regular" />
                    : <Eye size={18} weight="regular" />
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 fade-in">
                <Warning size={15} weight="bold" className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="admin-submit"
              type="submit"
              disabled={loading}
              className="w-full btn-primary h-12 text-sm uppercase tracking-wider font-bold rounded-xl mt-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Masuk...
                </span>
              ) : (
                <>
                  <ShieldCheck size={16} weight="bold" />
                  Masuk Dashboard
                  <ArrowRight size={16} weight="bold" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
