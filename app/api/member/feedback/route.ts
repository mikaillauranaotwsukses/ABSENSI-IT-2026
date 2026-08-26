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
    const body = await request.json();
    const { event_id, nrp: rawNrp, data_respons, rating_overall } = body;

    if (!event_id || !rawNrp) {
      return NextResponse.json({ success: false, message: 'Event ID dan NRP wajib diisi.' }, { status: 400 });
    }

    const cleanNrp = String(rawNrp).trim();
    const supabase = createAdminClient();

    // 1. Verify Anggota exists
    const { data: anggota, error: errAnggota } = await supabase
      .from('anggota')
      .select('nama, program_studi')
      .eq('nrp', cleanNrp)
      .maybeSingle();

    if (errAnggota || !anggota) {
      return NextResponse.json({
        success: false,
        message: `NRP "${cleanNrp}" tidak ditemukan dalam database anggota.`,
      });
    }

    // 2. Fetch existing feedback record
    const { data: existing } = await supabase
      .from('feedback')
      .select('id')
      .eq('event_id', event_id)
      .eq('nrp', cleanNrp)
      .maybeSingle();

    const payload: any = {
      ...(existing ? { id: existing.id } : {}),
      event_id:       event_id,
      nrp:            cleanNrp,
      data_respons:   data_respons ?? {},
      rating_overall: rating_overall ?? null,
      created_at:     new Date().toISOString(),
    };

    let { error: errUpsert } = await supabase
      .from('feedback')
      .upsert(payload, { onConflict: 'event_id, nrp' });

    if (errUpsert) {
      return NextResponse.json({
        success: false,
        message: 'Gagal menyimpan feedback: ' + errUpsert.message,
      });
    }

    return NextResponse.json({
      success: true,
      nama: anggota.nama,
      nrp: cleanNrp,
      message: 'Feedback berhasil dikirim. Terima kasih atas masukan Anda!',
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err?.message || 'Terjadi kesalahan server.',
    }, { status: 500 });
  }
}
