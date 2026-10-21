// =====================================================================
// titleLang.ts — aturan kecil: perlu diterjemahkan atau tidak? (dipakai browser DAN server)
//
// Judul karya dari asmr.one hampir selalu dalam bahasa aslinya (Jepang), sedangkan nama tag
// punya terjemahan resmi. Jadi:
//   ja -> judul asli, tidak diterjemahkan
//   en -> terjemahkan kalau judulnya masih mengandung huruf Jepang/Mandarin
//   zh -> terjemahkan kecuali sudah berupa Mandarin (ada kanji tapi tanpa kana)
// =====================================================================
import type { Lang } from "./lang";

export type TitleLang = Exclude<Lang, "ja">;

const KANA = /[\u3040-\u30ff]/;
const HAN = /[\u3400-\u9fff]/;

export function needsTranslation(title: string, lang: Lang): boolean {
  if (lang === "ja") return false;
  if (lang === "en") return KANA.test(title) || HAN.test(title);
  return KANA.test(title) || !HAN.test(title);
}
