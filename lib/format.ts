import type { Lang } from "./lang";
import type { Tag } from "./types";

export function fmtTime(sec?: number | null): string {
  const total = Math.round(sec ?? 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

// Pilih nama tag sesuai bahasa. Nama bawaan dari API (t.name) adalah nama Mandarin, dan itu
// juga yang dipakai pencarian. Kalau terjemahan bahasa yang dipilih tidak ada, pakai cadangannya.
//   zh: Mandarin            ja: Jepang -> Inggris -> Mandarin            en: Inggris -> Jepang -> Mandarin
export function pickTagName(n: { zh: string; en?: string; ja?: string }, lang: Lang): string {
  if (lang === "zh") return n.zh;
  if (lang === "ja") return n.ja || n.en || n.zh;
  return n.en || n.ja || n.zh;
}

export const tagName = (t: Tag, lang: Lang = "en"): string =>
  pickTagName(
    { zh: t.i18n?.["zh-cn"]?.name || t.name, en: t.i18n?.["en-us"]?.name, ja: t.i18n?.["ja-jp"]?.name },
    lang,
  );

// Alamat sampul lewat server kita sendiri (lihat app/api/cover).
export const coverUrl = (id: number, type: "240x240" | "main" | "sam" = "240x240"): string =>
  `/api/cover/${id}.jpg?type=${type}`;
