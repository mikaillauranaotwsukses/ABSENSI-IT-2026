export interface EventFeatureConfig {
  is_qr_enabled: boolean;
  is_feedback_enabled: boolean;
}

/**
 * Parses feature toggles (QR, Feedback) from an event object.
 * Reads directly from is_qr_enabled and is_feedback_enabled columns.
 * Defaults to true.
 */
export function parseEventConfig(event?: {
  is_qr_enabled?: boolean;
  is_feedback_enabled?: boolean;
  deskripsi?: string | null;
} | null): EventFeatureConfig {
  if (!event) {
    return { is_qr_enabled: true, is_feedback_enabled: true };
  }

  return {
    is_qr_enabled: typeof event.is_qr_enabled === 'boolean' ? event.is_qr_enabled : true,
    is_feedback_enabled: typeof event.is_feedback_enabled === 'boolean' ? event.is_feedback_enabled : true,
  };
}

/**
 * Strips any legacy configuration tags from event.deskripsi if present.
 */
export function cleanEventDeskripsi(deskripsi?: string | null): string {
  if (!deskripsi) return '';
  return deskripsi.replace(/<!--\[EVENT_CONFIG\]:[\s\S]*?-->/g, '').trim();
}
