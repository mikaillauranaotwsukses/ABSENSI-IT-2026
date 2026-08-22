import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vomaluikqvcryocefoke.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbWFsdWlrcXZjcnlvY2Vmb2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNjA1OTYsImV4cCI6MjEwMjkzNjU5Nn0.vXXUKihuEx3f3o5oe-h-6NuCyKISVcdVCg4G5etUCTo';

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (clientInstance) return clientInstance;

  clientInstance = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      lock: async (name, acquireTimeout, fn) => fn(), // Bypasses navigator.locks to prevent 'Failed to fetch' on mobile browsers
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return clientInstance;
}
