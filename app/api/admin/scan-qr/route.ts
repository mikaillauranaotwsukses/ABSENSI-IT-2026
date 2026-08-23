import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_id, nrp: rawNrp } = body;

    if (!event_id || !rawNrp) {
      return NextResponse.json({ success: false, message: 'Event ID dan NRP wajib diisi.' }, { status: 400 });
    }

    const cleanNrp = String(rawNrp).trim();
    const supabase = await createClient();

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

    // 3. Mark as QR Scanned
    const payload: any = {
      ...(existing ? { id: existing.id } : {}),
      event_id:       event_id,
      nrp:            cleanNrp,
      is_qr_scanned:  true,
      qr_scanned_at:  new Date().toISOString(),
      is_form_filled: existing?.is_form_filled ?? false,
      data_respons:   existing?.data_respons ?? {},
    };

    let { error: errUpsert } = await supabase.from('absensi').upsert(payload, { onConflict: 'event_id, nrp' });

    // Fallback if is_qr_scanned column doesn't exist in Supabase DB schema cache
    if (errUpsert && (errUpsert.message?.includes('is_qr_scanned') || errUpsert.message?.includes('schema cache') || errUpsert.code === 'PGRST204')) {
      delete payload.is_qr_scanned;
      delete payload.qr_scanned_at;
      delete payload.is_form_filled;
      const fallbackRes = await supabase.from('absensi').upsert(payload, { onConflict: 'event_id, nrp' });
      errUpsert = fallbackRes.error;
    }

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
