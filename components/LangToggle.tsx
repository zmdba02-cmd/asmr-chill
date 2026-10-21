"use client";

// Tombol bahasa nama tag di pojok atas: JP / EN / 中 (Mandarin).

import { setLang, useLang, type Lang } from "@/lib/lang";

const OPTIONS: { value: Lang; label: string; title: string }[] = [
  { value: "ja", label: "JP", title: "Nama tag: Jepang" },
  { value: "en", label: "EN", title: "Nama tag: Inggris" },
  { value: "zh", label: "中", title: "Nama tag: Mandarin" },
];

export function LangToggle() {
  const lang = useLang();
  return (
    <div className="langsw" role="group" aria-label="Bahasa nama tag">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" title={o.title} className={lang === o.value ? "on" : ""} onClick={() => setLang(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
