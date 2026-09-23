export interface EventFeatureConfig {
  is_qr_enabled: boolean;
  is_feedback_enabled: boolean;
  max_responses_per_user: number; // 1 = 1x (default), 2 = 2x, 0 = tanpa batas
}

/**
 * Parses feature toggles (QR, Feedback, Max Submissions) from an event object.
 * Reads from direct columns or fallback configuration tag in deskripsi.
 */
export function parseEventConfig(event?: {
  is_qr_enabled?: boolean;
  is_feedback_enabled?: boolean;
  max_responses_per_user?: number;
  deskripsi?: string | null;
} | null): EventFeatureConfig {
  if (!event) {
    return { is_qr_enabled: true, is_feedback_enabled: true, max_responses_per_user: 1 };
  }

  let maxResponses = typeof event.max_responses_per_user === 'number'
    ? event.max_responses_per_user
    : 1;

  // Also check deskripsi for embedded config tag if present
  if (event.deskripsi && typeof event.deskripsi === 'string') {
    const match = event.deskripsi.match(/<!--\[FORM_CONFIG\]:([\s\S]*?)-->/);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (typeof parsed.max_responses === 'number') {
          maxResponses = parsed.max_responses;
        }
      } catch (e) {
        console.warn('Gagal membaca FORM_CONFIG di deskripsi:', e);
      }
    }
  }

  return {
    is_qr_enabled: typeof event.is_qr_enabled === 'boolean' ? event.is_qr_enabled : true,
    is_feedback_enabled: typeof event.is_feedback_enabled === 'boolean' ? event.is_feedback_enabled : true,
    max_responses_per_user: maxResponses,
  };
}

/**
 * Strips any configuration tags from event.deskripsi if present.
 */
export function cleanEventDeskripsi(deskripsi?: string | null): string {
  if (!deskripsi) return '';
  return deskripsi
    .replace(/<!--\[EVENT_CONFIG\]:[\s\S]*?-->/g, '')
    .replace(/<!--\[FORM_CONFIG\]:[\s\S]*?-->/g, '')
    .trim();
}

/**
 * Encodes feature settings (e.g. max_responses) into deskripsi as a transparent HTML tag.
 */
export function encodeEventDeskripsi(
  deskripsi: string,
  config: { max_responses?: number }
): string {
  const clean = cleanEventDeskripsi(deskripsi);
  const tag = `<!--[FORM_CONFIG]:${JSON.stringify({ max_responses: config.max_responses ?? 1 })}-->`;
  return clean ? `${clean}\n\n${tag}` : tag;
}
