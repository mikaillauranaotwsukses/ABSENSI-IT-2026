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
      return NextResponse.json({ success: false, message: 'NRP dan password baru wajib diisi.', debug: { nrp, newPassword } }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ success: false, message: 'Password minimal 4 karakter.' });
    }

    const supabase = createAdminClient();

    // Step 1: Cek anggota ada
    const { data: anggota, error: errAnggota } = await supabase
      .from('anggota')
      .select('nrp, nama, password_hash, must_change_password')
      .eq('nrp', nrp.trim())
      .maybeSingle();

    if (errAnggota) {
      return NextResponse.json({ success: false, message: 'Error cek anggota: ' + errAnggota.message, debug_step: 'select_anggota' });
    }

    if (!anggota) {
      return NextResponse.json({ success: false, message: `NRP "${nrp}" tidak ditemukan.`, debug_step: 'not_found' });
    }

    // Step 2: Update password
    const { error: errUpdate, data: updateData } = await supabase
      .from('anggota')
      .update({
        password_hash: newPassword,
        must_change_password: false,
      })
      .eq('nrp', nrp.trim())
      .select();

    if (errUpdate) {
      return NextResponse.json({
        success: false,
        message: 'Error update password: ' + errUpdate.message,
        debug_step: 'update_failed',
        debug_error_code: errUpdate.code,
        debug_error_details: errUpdate.details,
        debug_hint: errUpdate.hint,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diperbarui.',
      debug_rows_updated: updateData?.length ?? 0,
      debug_nrp: nrp,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err?.message || 'Terjadi kesalahan server.',
      debug_step: 'catch',
    }, { status: 500 });
  }
}
