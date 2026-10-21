// =====================================================================
// tagDict.ts — "kamus" tag: nama Mandarin (yang dipakai pencarian) -> nama Inggris & Jepang.
//
// Kenapa perlu? Pencarian harus memakai nama Mandarin (皆大欢喜), tapi kamu mungkin
// lebih nyaman membaca "Totally Happy". Kamus ini diisi otomatis:
//   1. dari tag di setiap karya yang pernah tampil di layarmu (learnTags), dan
//   2. dari daftar tag situs asli kalau tersedia (ensureServerTags -> /api/tags).
// Disimpan di localStorage, jadi makin lama dipakai makin lengkap saran tagnya.
//
// Polanya sama dengan lib/favorites.ts (store kecil + useSyncExternalStore).
// =====================================================================

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { pickTagName } from "./format";
import { useLang } from "./lang";
import type { Tag } from "./types";

const KEY = "tagdict2"; // v2: menyimpan nama per bahasa (v1 hanya satu label)
type Names = { en?: string; ja?: string }; // nama Inggris & Jepang; nama Mandarin = kuncinya
type Dict = Record<string, Names>; // nama Mandarin -> nama di bahasa lain

const EMPTY: Dict = {};
let cache: Dict | null = null;
const listeners = new Set<() => void>();

function load(): Dict {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Dict) : {};
  } catch {
    return {};
  }
}
const read = (): Dict => (cache ??= load());

function write(next: Dict): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* abaikan kalau penyimpanan diblokir */
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

// Tambahkan tag baru ke kamus. Tidak menulis apa pun kalau tidak ada yang berubah
// (penting supaya tidak memicu render berulang).
export function learnTags(tags: Tag[]): void {
  const current = read();
  let next: Dict | null = null;
  for (const t of tags) {
    if (!t?.name) continue;
    const names: Names = { en: t.i18n?.["en-us"]?.name, ja: t.i18n?.["ja-jp"]?.name };
    const old = current[t.name];
    if (!old || old.en !== names.en || old.ja !== names.ja) {
      next ??= { ...current };
      next[t.name] = names;
    }
  }
  if (next) write(next);
}

// Coba ambil daftar tag lengkap dari situs asli (lewat route /api/tags), sekali per kunjungan.
// Kalau gagal tidak apa-apa: kamus tetap terisi dari karya yang kamu lihat.
let serverRequested = false;
export async function ensureServerTags(): Promise<void> {
  if (serverRequested) return;
  serverRequested = true;
  try {
    const res = await fetch("/api/tags");
    if (!res.ok) return;
    const data = (await res.json()) as { tags?: Tag[] };
    if (Array.isArray(data.tags)) learnTags(data.tags);
  } catch {
    /* abaikan */
  }
}

export type TagEntry = { name: string; label: string; aliases: string[] };

export function useTagDict() {
  const dict = useSyncExternalStore(subscribe, read, () => EMPTY);
  const lang = useLang(); // label mengikuti pilihan bahasa di pojok atas

  const entries = useMemo<TagEntry[]>(
    () =>
      Object.entries(dict)
        .map(([name, n]) => ({
          name,
          label: pickTagName({ zh: name, en: n.en, ja: n.ja }, lang),
          aliases: [name, n.en, n.ja].filter((x): x is string => !!x).map((x) => x.toLowerCase()),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [dict, lang],
  );

  // Nama yang ditampilkan untuk sebuah tag (sesuai bahasa; kalau tidak dikenal, nama Mandarin-nya).
  const labelOf = useCallback(
    (name: string): string => {
      const n = dict[name];
      return n ? pickTagName({ zh: name, en: n.en, ja: n.ja }, lang) : name;
    },
    [dict, lang],
  );

  // Teks yang diketik pengguna -> nama Mandarin untuk pencarian.
  // Boleh mengetik nama Mandarin, Inggris, atau Jepang (tanpa peduli huruf besar/kecil);
  // kalau tidak dikenal, dianggap pengguna sudah mengetik nama Mandarin yang benar.
  const resolve = useCallback(
    (text: string): string => {
      const t = text.trim();
      if (!t) return "";
      const lower = t.toLowerCase();
      for (const e of entries) {
        if (e.name === t || e.aliases.includes(lower)) return e.name;
      }
      return t;
    },
    [entries],
  );

  return { entries, labelOf, resolve };
}
