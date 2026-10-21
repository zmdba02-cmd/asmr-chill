"use client";

// Tombol bahasa di pojok atas: JP / EN / 中 (Mandarin). Mengubah nama tag DAN judul karya.

import { setLang, useLang, type Lang } from "@/lib/lang";

const OPTIONS: { value: Lang; label: string; title: string }[] = [
  { value: "ja", label: "JP", title: "Judul & tag: Jepang (judul asli)" },
  { value: "en", label: "EN", title: "Judul & tag: Inggris" },
  { value: "zh", label: "中", title: "Judul & tag: Mandarin" },
];

export function LangToggle() {
  const lang = useLang();
  return (
    <div className="langsw" role="group" aria-label="Bahasa judul dan tag">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" title={o.title} className={lang === o.value ? "on" : ""} onClick={() => setLang(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
