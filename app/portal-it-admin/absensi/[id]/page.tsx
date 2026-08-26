import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import AbsensiReportClient from './AbsensiReportClient';
import { Event, Anggota, Absensi, Feedback } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AbsensiReportPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/portal-it-admin/login');

  const { data: event, error: eventError } = await supabase
    .from('event')
    .select('*')
    .eq('id', id)
    .single();

  if (eventError || !event) return notFound();

  // Fetch ALL anggota, ALL absensi, and ALL feedback for this event in parallel
  let allAnggota: Anggota[] = [];
  let absensiList: Absensi[] = [];
  let feedbackList: Feedback[] = [];

  const [resAnggota, resAbsensi, resFeedback] = await Promise.allSettled([
    supabase.from('anggota').select('*').order('nama'),
    supabase.from('absensi').select('*').eq('event_id', id).order('created_at'),
    supabase.from('feedback').select('*').eq('event_id', id).order('created_at'),
  ]);

  if (resAnggota.status === 'fulfilled' && resAnggota.value.data) {
    allAnggota = resAnggota.value.data as Anggota[];
  }
  if (resAbsensi.status === 'fulfilled' && resAbsensi.value.data) {
    absensiList = resAbsensi.value.data as Absensi[];
  }
  if (resFeedback.status === 'fulfilled' && resFeedback.value.data) {
    feedbackList = resFeedback.value.data as Feedback[];
  }

  return (
    <main className="min-h-screen animated-bg text-white">
      <div className="fixed w-96 h-96 rounded-full bg-indigo-700/20 -top-24 -left-24 blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header Navigation */}
        <div className="slide-up mb-6">
          <div className="flex items-center gap-3">
            <Link href="/portal-it-admin/events" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Laporan & Evaluasi Event</h1>
              <p className="text-indigo-300 text-sm font-semibold">{event.nama_event}</p>
            </div>
          </div>
        </div>

        {/* Client component: Powerful Multi-Filter Roster + PDF Exporter + Feedback Analytics */}
        <AbsensiReportClient
          event={event as Event}
          allAnggota={allAnggota}
          absensiList={absensiList}
          feedbackList={feedbackList}
        />
      </div>
    </main>
  );
}
