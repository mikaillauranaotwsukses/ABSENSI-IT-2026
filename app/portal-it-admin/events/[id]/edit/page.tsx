import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import EditEventForm from './EditEventForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/portal-it-admin/login');

  const { data: event, error } = await supabase
    .from('event')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !event) return notFound();

  return (
    <main className="min-h-screen animated-bg text-white">
      <div className="blob w-96 h-96 bg-indigo-700 fixed -top-24 -left-24 pointer-events-none" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8 slide-up">
          <Link href="/portal-it-admin/events" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Event</h1>
            <p className="text-slate-400 text-sm">{event.nama_event}</p>
          </div>
        </div>
        <EditEventForm event={event} />
      </div>
    </main>
  );
}
