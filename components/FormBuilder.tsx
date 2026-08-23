'use client';

import { useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FormField, FormFieldType } from '@/lib/types';

interface Props {
  fields: FormField[];
  setFields: (fn: (prev: FormField[]) => FormField[]) => void;
  /** Pass true when used in admin (enables image upload for info blocks) */
  isAdmin?: boolean;
}

const FIELD_META: Record<FormFieldType, { icon: string; label: string; isInput: boolean }> = {
  text:     { icon: '📝', label: 'Teks Pendek',   isInput: true  },
  number:   { icon: '🔢', label: 'Angka',          isInput: true  },
  textarea: { icon: '📄', label: 'Teks Panjang',   isInput: true  },
  select:   { icon: '📋', label: 'Dropdown',        isInput: true  },
  radio:    { icon: '⭕', label: 'Pilihan Ganda',   isInput: true  },
  file:     { icon: '📎', label: 'Upload File',     isInput: true  },
  info:     { icon: '💡', label: 'Blok Info/Foto',  isInput: false },
};

export default function FormBuilder({ fields, setFields, isAdmin = false }: Props) {
  const supabase = createClient();
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // ── Helpers ─────────────────────────────────────────────────
  const addField = (type: FormFieldType) => {
    setFields((prev) => [
      ...prev,
      {
        label:   type === 'info' ? '' : '',
        type,
        options: type === 'select' || type === 'radio' ? [''] : undefined,
        required: false,
        content:   type === 'info' ? '' : undefined,
        image_url: type === 'info' ? undefined : undefined,
      },
    ]);
  };

  const updateField = (idx: number, updates: Partial<FormField>) => {
    setFields((prev) => {
      const oldLabel = prev[idx]?.label;
      const newLabel = updates.label;

      return prev.map((f, i) => {
        let updated = i === idx ? { ...f, ...updates } : f;

        // Auto-update child condition field_label if parent label changes
        if (
          oldLabel &&
          newLabel !== undefined &&
          oldLabel !== newLabel &&
          updated.condition?.field_label === oldLabel
        ) {
          updated = {
            ...updated,
            condition: {
              ...updated.condition,
              field_label: newLabel,
            },
          };
        }
        return updated;
      });
    });
  };

  const updateOption = (fi: number, oi: number, value: string) =>
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== fi || !f.options) return f;
        const opts = [...f.options];
        opts[oi] = value;
        return { ...f, options: opts };
      })
    );

  const addOption    = (fi: number) =>
    setFields((prev) =>
      prev.map((f, i) => (i !== fi ? f : { ...f, options: [...(f.options ?? []), ''] }))
    );

  const removeOption = (fi: number, oi: number) =>
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== fi || !f.options) return f;
        return { ...f, options: f.options.filter((_, j) => j !== oi) };
      })
    );

  const removeField  = (idx: number) =>
    setFields((prev) => prev.filter((_, i) => i !== idx));

  const moveField    = (idx: number, dir: -1 | 1) =>
    setFields((prev) => {
      const arr = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= arr.length) return arr;
      [arr[idx], arr[t]] = [arr[t], arr[idx]];
      return arr;
    });

  // ── Upload image for info block ──────────────────────────────
  const handleInfoImageUpload = async (idx: number, file: File) => {
    // 1. Try Supabase Storage first
    try {
      const ext  = file.name.split('.').pop();
      const path = `info-blocks/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error } = await supabase.storage
        .from('event-assets')
        .upload(path, file, { upsert: true });

      if (!error && data?.path) {
        const { data: { publicUrl } } = supabase.storage
          .from('event-assets')
          .getPublicUrl(data.path);

        updateField(idx, { image_url: publicUrl });
        return;
      }
    } catch (e) {
      console.warn('Supabase storage upload failed, using base64 fallback:', e);
    }

    // 2. Fallback to FileReader Base64 Data URL if bucket missing or error occurs
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target?.result as string;
      if (base64Url) {
        updateField(idx, { image_url: base64Url });
      }
    };
    reader.onerror = () => {
      alert('Gagal membaca file gambar.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      {/* ── Add field buttons ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(FIELD_META) as FormFieldType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addField(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
              type === 'info'
                ? 'border-amber-500/40 bg-amber-600/10 text-amber-300 hover:border-amber-500/70 hover:bg-amber-600/20'
                : type === 'file'
                ? 'border-cyan-500/40 bg-cyan-600/10 text-cyan-300 hover:border-cyan-500/70 hover:bg-cyan-600/20'
                : 'border-slate-600/50 bg-slate-800/40 text-slate-300 hover:border-indigo-500/50 hover:bg-indigo-600/10 hover:text-indigo-300'
            }`}
          >
            <span>{FIELD_META[type].icon}</span>
            {FIELD_META[type].label}
          </button>
        ))}
      </div>

      {/* ── Field list ── */}
      {fields.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-700 rounded-xl">
          <p className="text-slate-500 text-sm">Tambahkan field di atas untuk menyusun form</p>
          <p className="text-slate-600 text-xs mt-1">(Biarkan kosong jika hanya butuh NRP)</p>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, idx) => {
            const previousFieldsWithLabels = fields.slice(0, idx).filter((f) => f.label.trim());

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border space-y-3 ${
                  field.type === 'info'
                    ? 'bg-amber-900/10 border-amber-500/20'
                    : field.type === 'file'
                    ? 'bg-cyan-900/10 border-cyan-500/20'
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}
              >
                {/* ── Field header ── */}
                <div className="flex items-center gap-2">
                  <span className="text-sm">{FIELD_META[field.type].icon}</span>
                  <span className={`text-xs font-medium uppercase tracking-wider ${
                    field.type === 'info' ? 'text-amber-400' :
                    field.type === 'file' ? 'text-cyan-400' :
                    'text-slate-400'
                  }`}>
                    {FIELD_META[field.type].label}
                  </span>
                  <div className="flex-1" />
                  <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0}
                    className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}
                    className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  <button type="button" onClick={() => removeField(idx)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* ── INFO BLOCK ── */}
                {field.type === 'info' && (
                  <>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      placeholder="Judul blok (opsional)..."
                      className="input-glow w-full bg-slate-900/60 border border-amber-500/20 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm transition-all"
                    />
                    <textarea
                      value={field.content ?? ''}
                      onChange={(e) => updateField(idx, { content: e.target.value })}
                      placeholder="Tulis penjelasan / informasi untuk anggota..."
                      rows={3}
                      className="input-glow w-full bg-slate-900/60 border border-amber-500/20 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm transition-all resize-none"
                    />
                    {/* Image upload */}
                    <div>
                      <p className="text-xs text-amber-400/70 mb-1.5 font-medium">Gambar (opsional):</p>
                      {field.image_url ? (
                        <div className="relative group inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={field.image_url}
                            alt="Info block"
                            className="max-h-60 w-auto h-auto rounded-lg border border-amber-500/20 object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => updateField(idx, { image_url: undefined })}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-amber-500/30 hover:border-amber-500/60 text-amber-400/70 hover:text-amber-400 text-xs cursor-pointer transition-all w-fit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          Upload gambar
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={(el) => { fileRefs.current[idx] = el; }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleInfoImageUpload(idx, f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </>
                )}

                {/* ── REGULAR INPUT FIELDS ── */}
                {field.type !== 'info' && (
                  <>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      placeholder="Label pertanyaan..."
                      className="input-glow w-full bg-slate-900/60 border border-slate-600/40 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm transition-all"
                    />

                    {/* File field hint */}
                    {field.type === 'file' && (
                      <p className="text-xs text-cyan-400/70">
                        Anggota dapat upload: foto, video, atau PDF (maks. 20MB)
                      </p>
                    )}

                    {/* Required toggle */}
                    <label
                      className="flex items-center gap-2 cursor-pointer w-fit"
                      onClick={() => updateField(idx, { required: !field.required })}
                    >
                      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${field.required ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${field.required ? 'translate-x-5' : 'translate-x-1'}`} />
                      </div>
                      <span className="text-xs text-slate-400">Wajib diisi</span>
                    </label>

                    {/* Options for select / radio */}
                    {(field.type === 'select' || field.type === 'radio') && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 font-medium">Pilihan:</p>
                        {field.options?.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <span className="text-slate-600 text-xs w-4 text-center">{oi + 1}.</span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(idx, oi, e.target.value)}
                              placeholder={`Pilihan ${oi + 1}...`}
                              className="input-glow flex-1 bg-slate-900/60 border border-slate-600/40 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 text-xs transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(idx, oi)}
                              disabled={(field.options?.length ?? 0) <= 1}
                              className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOption(idx)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Tambah pilihan
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* ── BRANCHING LOGIC / CONDITIONAL (Google Forms style) ── */}
                {idx > 0 && previousFieldsWithLabels.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-purple-300 flex items-center gap-1.5">
                        <span>⚡</span> Logika Percabangan (Tampilkan Hanya Jika...)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (field.condition) {
                            updateField(idx, { condition: undefined });
                          } else {
                            const firstParent = previousFieldsWithLabels[0];
                            updateField(idx, {
                              condition: {
                                field_label: firstParent?.label || '',
                                operator: 'equals',
                                value: firstParent?.options?.[0] || '',
                              },
                            });
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-all font-medium ${
                          field.condition
                            ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }`}
                      >
                        {field.condition ? '⚡ Percabangan Aktif (Hapus)' : '+ Tambah Percabangan'}
                      </button>
                    </div>

                    {field.condition && (
                      <div className="mt-2.5 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-purple-300 uppercase tracking-wider mb-1 font-semibold">
                              1. Jika Pertanyaan:
                            </label>
                            <select
                              value={field.condition.field_label}
                              onChange={(e) => {
                                const parentLabel = e.target.value;
                                const parentField = fields.find((f) => f.label === parentLabel);
                                updateField(idx, {
                                  condition: {
                                    ...field.condition!,
                                    field_label: parentLabel,
                                    value: parentField?.options?.[0] || '',
                                  },
                                });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                            >
                              {previousFieldsWithLabels.map((f, i) => (
                                <option key={i} value={f.label}>{f.label || `Field ${i + 1}`}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-purple-300 uppercase tracking-wider mb-1 font-semibold">
                              2. Syarat:
                            </label>
                            <select
                              value={field.condition.operator}
                              onChange={(e) => updateField(idx, {
                                condition: { ...field.condition!, operator: e.target.value as 'equals' | 'not_equals' }
                              })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                            >
                              <option value="equals">Dijawab == (Sama Dengan)</option>
                              <option value="not_equals">Dijawab != (Tidak Sama With)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-purple-300 uppercase tracking-wider mb-1 font-semibold">
                              3. Nilai Jawaban:
                            </label>
                            {(() => {
                              const parentField = fields.find((f) => f.label === field.condition?.field_label);
                              if (parentField?.options && parentField.options.length > 0) {
                                return (
                                  <select
                                    value={field.condition.value}
                                    onChange={(e) => updateField(idx, {
                                      condition: { ...field.condition!, value: e.target.value }
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                                  >
                                    {parentField.options.map((opt, i) => (
                                      <option key={i} value={opt}>{opt || `Opsi ${i + 1}`}</option>
                                    ))}
                                  </select>
                                );
                              }
                              return (
                                <input
                                  type="text"
                                  value={field.condition.value}
                                  onChange={(e) => updateField(idx, {
                                    condition: { ...field.condition!, value: e.target.value }
                                  })}
                                  placeholder="cth: Hadir"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                                />
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
