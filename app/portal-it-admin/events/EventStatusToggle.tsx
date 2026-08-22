'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  eventId: string;
  initialStatus: boolean;
}

export default function EventStatusToggle({ eventId, initialStatus }: Props) {
  const supabase = createClient();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('event')
      .update({ status: !status })
      .eq('id', eventId);

    if (!error) setStatus(!status);
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 disabled:opacity-60 ${
        status ? 'bg-green-500' : 'bg-slate-600'
      }`}
      title={status ? 'Klik untuk tutup' : 'Klik untuk buka'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
          status ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
