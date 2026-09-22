export interface EventFeatureConfig {
  is_qr_enabled: boolean;
  is_feedback_enabled: boolean;
}

/**
 * Parses feature toggles (QR, Feedback) from an event object.
 * Priority:
 * 1. Dedicated database columns (if present in Supabase)
 * 2. Embedded metadata tag in event.deskripsi: <!--[EVENT_CONFIG]:{...}-->
 * 3. Default to true
 */
export function parseEventConfig(event?: {
  is_qr_enabled?: boolean;
  is_feedback_enabled?: boolean;
  deskripsi?: string | null;
} | null): EventFeatureConfig {
  if (!event) {
    return { is_qr_enabled: true, is_feedback_enabled: true };
  }

  let qr = typeof event.is_qr_enabled === 'boolean' ? event.is_qr_enabled : undefined;
  let fb = typeof event.is_feedback_enabled === 'boolean' ? event.is_feedback_enabled : undefined;

  // If column values are missing or not boolean, inspect deskripsi metadata tag
  if ((qr === undefined || fb === undefined) && event.deskripsi) {
    const match = event.deskripsi.match(/<!--\[EVENT_CONFIG\]:([\s\S]*?)-->/);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (qr === undefined && typeof parsed.is_qr_enabled === 'boolean') {
          qr = parsed.is_qr_enabled;
        }
        if (fb === undefined && typeof parsed.is_feedback_enabled === 'boolean') {
          fb = parsed.is_feedback_enabled;
        }
      } catch {
        // ignore parse error
      }
    }
  }

  return {
    is_qr_enabled: qr !== undefined ? qr : true,
    is_feedback_enabled: fb !== undefined ? fb : true,
  };
}

/**
 * Removes the internal configuration tag from event.deskripsi
 * so users only see their broadcast text.
 */
export function cleanEventDeskripsi(deskripsi?: string | null): string {
  if (!deskripsi) return '';
  return deskripsi.replace(/<!--\[EVENT_CONFIG\]:[\s\S]*?-->/g, '').trim();
}

/**
 * Builds the full deskripsi string including the internal metadata tag
 * for events where QR or Feedback is toggled off.
 */
export function buildEventDeskripsiWithConfig(
  cleanDeskripsi: string,
  config: { is_qr_enabled: boolean; is_feedback_enabled: boolean }
): string {
  const base = cleanEventDeskripsi(cleanDeskripsi);
  const tag = `\n\n<!--[EVENT_CONFIG]:${JSON.stringify(config)}-->`;
  return base + tag;
}
