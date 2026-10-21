"use client";

// =====================================================================
// TagPicker — satu daftar tag berbentuk "chip" + kotak input untuk menambah.
// Dipakai dua kali di SearchBar: sekali untuk tag yang DISERTAKAN, sekali untuk DIKECUALIKAN.
//
// Cara pakai: ketik nama tag lalu tekan Enter (atau tombol +). Saran muncul dari <datalist>
// (fitur bawaan browser) berdasarkan kamus tag di lib/tagDict.ts. Klik ✕ pada chip untuk menghapus.
// =====================================================================

import { useId, useState } from "react";
import { useTagDict } from "@/lib/tagDict";

type Props = {
  title: string;
  variant: "inc" | "exc"; // hanya untuk warna di CSS
  tags: string[]; // nama Mandarin (nilai yang dipakai pencarian)
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
};

export function TagPicker({ title, variant, tags, onAdd, onRemove }: Props) {
  const [text, setText] = useState("");
  const listId = useId();
  const { entries, labelOf, resolve } = useTagDict();

  function commit() {
    const name = resolve(text);
    if (name) onAdd(name);
    setText("");
  }

  return (
    <div className={`tagpicker ${variant}`}>
      <div className="tp-title">{title}</div>
      <div className="chips">
        {tags.map((t) => (
          <span key={t} className="chip" title={t}>
            {labelOf(t)}
            <button type="button" aria-label={`Hapus ${labelOf(t)}`} onClick={() => onRemove(t)}>
              ✕
            </button>
          </span>
        ))}
        <input
          list={listId}
          value={text}
          placeholder="ketik tag…"
          aria-label={title}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // jangan kirim form pencarian
              commit();
            }
          }}
        />
        <button type="button" className="add" aria-label={`Tambah ke ${title}`} onClick={commit}>
          +
        </button>
      </div>
      <datalist id={listId}>
        {entries.map((en) => (
          <option key={en.name} value={en.label} label={en.name} />
        ))}
      </datalist>
    </div>
  );
}
