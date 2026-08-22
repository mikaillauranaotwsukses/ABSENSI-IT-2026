export type FormFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'radio'
  | 'textarea'
  | 'file'   // Member uploads a file/image/video
  | 'info';  // Admin-inserted info block (text + optional image)

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
}

export interface Event {
  id: string;
  nama_event: string;
  deskripsi: string;
  status: boolean;
  form_schema: FormField[];
  created_at: string;
}

export interface Absensi {
  id: string;
  event_id: string;
  nrp: string;
  data_respons: Record<string, string | number>;
  created_at: string;
  anggota?: Anggota;
  event?: Event;
}

export interface AnggotaWithStatus extends Anggota {
  hadir: boolean;
  absensi?: Absensi;
}
