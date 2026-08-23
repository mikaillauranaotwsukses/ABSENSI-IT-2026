import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://vomaluikqvcryocefoke.supabase.co';

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbWFsdWlrcXZjcnlvY2Vmb2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNjA1OTYsImV4cCI6MjEwMjkzNjU5Nn0.vXXUKihuEx3f3o5oe-h-6NuCyKISVcdVCg4G5etUCTo';

function createAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const { nrp, newPassword } = await request.json();

    if (!nrp || !newPassword) {
      return NextResponse.json({ success: false, message: 'NRP dan password baru wajib diisi.' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ success: false, message: 'Password minimal 4 karakter.' });
    }

    const supabase = createAdminClient();

    // Pastikan anggota ada terlebih dahulu
    const { data: anggota, error: errAnggota } = await supabase
      .from('anggota')
      .select('nrp, nama')
      .eq('nrp', nrp.trim())
      .maybeSingle();

    if (errAnggota || !anggota) {
      return NextResponse.json({ success: false, message: 'NRP tidak ditemukan.' });
    }

    // Update password dengan service role key (bypass RLS)
    const { error: errUpdate } = await supabase
      .from('anggota')
      .update({
        password_hash: newPassword,
        must_change_password: false,
      })
      .eq('nrp', nrp.trim());

    if (errUpdate) {
      return NextResponse.json({
        success: false,
        message: 'Gagal menyimpan password: ' + errUpdate.message,
      });
    }

    return NextResponse.json({ success: true, message: 'Password berhasil diperbarui.' });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err?.message || 'Terjadi kesalahan server.',
    }, { status: 500 });
  }
}
