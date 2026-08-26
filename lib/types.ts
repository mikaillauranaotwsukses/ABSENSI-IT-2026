export type FormFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'radio'
  | 'textarea'
  | 'file'     // Member uploads a file/image/video
  | 'info'     // Admin-inserted info block (text + optional image)
  | 'rating'   // 1 to 5 Star Rating (ideal for feedback)
  | 'scale';   // 1 to 10 Scale (ideal for feedback)

export interface FormFieldCondition {
  field_label: string;                  // Target field to watch (e.g. "Status Kehadiran")
  operator: 'equals' | 'not_equals';    // Operator
  value: string;                        // Target value (e.g. "Hadir" or "Tidak Hadir")
}

export interface FormField {
  label: string;
  type: FormFieldType;
  options?: string[];                   // for select / radio
  required?: boolean;
  // For 'info' blocks only:
  content?: string;                     // descriptive text / explanation
  image_url?: string;                   // optional image from Supabase Storage or Base64
  // Branching / Conditional logic:
  condition?: FormFieldCondition;       // optional condition for visibility
}

export interface Anggota {
  nrp: string;
  nama: string;
  program_studi: string;
  password_hash?: string;               // Hashed / plain password (default: nrp or absensi2026)
  must_change_password?: boolean;       // Flag forcing user to change password on first login
}

export interface Event {
  id: string;
  nama_event: string;
  deskripsi: string;
  status: boolean;
  form_schema: FormField[];
  feedback_schema?: FormField[];        // Dynamic custom feedback schema
  created_at: string;
}

export interface Absensi {
  id: string;
  event_id: string;
  nrp: string;
  data_respons: Record<string, string | number>;
  is_form_filled?: boolean;             // True if user submitted the dynamic form
  is_qr_scanned?: boolean;              // True if committee scanned member's QR code
  qr_scanned_at?: string;               // Timestamp when QR was scanned by admin
  created_at: string;
  anggota?: Anggota;
  event?: Event;
}

export interface Feedback {
  id: string;
  event_id: string;
  nrp: string;
  data_respons: Record<string, string | number>;
  rating_overall?: number;              // 1-5 overall score if provided
  created_at: string;
  anggota?: Anggota;
  event?: Event;
}

export interface AnggotaWithStatus extends Anggota {
  hadir: boolean;                       // True if either form is filled or QR is scanned
  is_form_filled: boolean;
  is_qr_scanned: boolean;
  has_feedback?: boolean;
  absensi?: Absensi;
  feedback?: Feedback;
}
