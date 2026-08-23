import { createClient } from '@/lib/supabase/server';
import { Event } from '@/lib/types';
import HomePageClient from './HomePageClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from('event')
    .select('*')
    .eq('status', true)
    .order('created_at', { ascending: false });

  return <HomePageClient events={events as Event[]} error={!!error} />;
}
