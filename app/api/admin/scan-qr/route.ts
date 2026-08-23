import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Fallback hardcoded agar tidak undefined di Vercel sebelum env var di-set
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://vomaluikqvcryocefoke.supabase.co';

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbWFsdWlrcXZjcnlvY2Vmb2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNjA1OTYsImV4cCI6MjEwMjkzNjU5Nn0.vXXUKihuEx3f3o5oe-h-6NuCyKISVcdVCg4G5etUCTo';

// Admin client — gunakan service role key jika tersedia, fallback ke anon key
function createAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_id, nrp: rawNrp } = body;

    if (!event_id || !rawNrp) {
      return NextResponse.json({ success: false, message: 'Event ID dan NRP wajib diisi.' }, { status: 400 });
    }

    const cleanNrp = String(rawNrp).trim();
    const supabase = createAdminClient();

    // 1. Verify Anggota exists
    const { data: anggota, error: errAnggota } = await supabase
      .from('anggota')
      .select('*')
      .eq('nrp', cleanNrp)
      .maybeSingle();

    if (errAnggota || !anggota) {
      return NextResponse.json({
        success: false,
        message: `NRP "${cleanNrp}" tidak ditemukan dalam database anggota.`,
      });
    }

    // 2. Fetch existing absensi record
    const { data: existing } = await supabase
      .from('absensi')
      .select('*')
      .eq('event_id', event_id)
      .eq('nrp', cleanNrp)
      .maybeSingle();

    // 3. Upsert dengan service role key (tidak terkena RLS)
    const { error: errUpsert } = await supabase.from('absensi').upsert(
      {
        ...(existing ? { id: existing.id } : {}),
        event_id:       event_id,
        nrp:            cleanNrp,
        is_qr_scanned:  true,
        qr_scanned_at:  new Date().toISOString(),
        is_form_filled: existing?.is_form_filled ?? false,
        data_respons:   existing?.data_respons ?? {},
      },
      { onConflict: 'event_id, nrp' }
    );

    if (errUpsert) {
      return NextResponse.json({
        success: false,
        message: 'Gagal update database: ' + errUpsert.message,
      });
    }

    return NextResponse.json({
      success: true,
      nama: anggota.nama,
      nrp: anggota.nrp,
      prodi: anggota.program_studi,
      message: 'Berhasil Check-in via QR Code!',
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err?.message || 'Terjadi kesalahan server.',
    }, { status: 500 });
  }
}
