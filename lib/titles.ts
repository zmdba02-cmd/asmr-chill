// =====================================================================
// titles.ts — judul karya sesuai bahasa yang dipilih (JP / EN / 中).
//
// Pemakaian di komponen:   const t = useTitles(works);   lalu tampilkan  t(work)
//   - JP : judul asli, langsung.
//   - EN/中 : mula-mula judul asli, lalu diganti terjemahan begitu /api/translate menjawab.
//     Terjemahan disimpan di localStorage, jadi lain kali langsung tampil tanpa menunggu.
//
// Pola "store + useSyncExternalStore" sama seperti lib/favorites.ts.
// =====================================================================
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useLang } from "./lang";
import { needsTranslation, type TitleLang } from "./titleLang";
import type { Work } from "./types";

type Item = Pick<Work, "id" | "title">;
type Rec = Record<string, string>; // "w<id>" -> terjemahan ("w" supaya urutan sisipan terjaga)
type Store = Partial<Record<TitleLang, Rec>>;

const KEY = "titleTr";
const MAX = 4000; // paling banyak 4000 judul per bahasa disimpan
const CHUNK = 30;

const EMPTY: Store = {};
let cache: Store | null = null;
const listeners = new Set<() => void>();

const waiting = new Map<TitleLang, Map<number, string>>();
const busy = new Set<string>(); // sedang diminta / sudah gagal pada sesi ini: jangan diminta lagi
let timer: number | undefined;

function read(): Store {
  if (cache === null) {
    try {
      cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Store;
    } catch {
      cache = {};
    }
  }
  return cache;
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

function merge(lang: TitleLang, add: Rec): void {
  const store = read();
  const entries = Object.entries({ ...store[lang], ...add });
  const next: Store = { ...store, [lang]: Object.fromEntries(entries.slice(-MAX)) };
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* abaikan kalau penyimpanan penuh/diblokir */
  }
  listeners.forEach((notify) => notify());
}

// Terjemahan langsung dari browser (IP-mu sendiri). Dipakai kalau server gagal, karena IP hosting
// kadang diblokir penyedia terjemahan sementara browser-mu tidak.
async function browserTranslate(text: string, lang: TitleLang): Promise<string> {
  const q = new URLSearchParams({ client: "gtx", sl: "auto", tl: lang === "zh" ? "zh-CN" : "en", dt: "t", q: text });
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?${q}`);
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as unknown;
  const segments = Array.isArray(data) && Array.isArray(data[0]) ? (data[0] as unknown[]) : [];
  return segments.map((x) => (Array.isArray(x) && typeof x[0] === "string" ? x[0] : "")).join("").trim();
}

async function fallbackInBrowser(lang: TitleLang, items: { id: number; title: string }[]): Promise<void> {
  const BATCH = 4;
  for (let i = 0; i < items.length; i += BATCH) {
    const results = await Promise.all(
      items.slice(i, i + BATCH).map(async (it) => {
        try {
          return [it.id, await browserTranslate(it.title, lang)] as const;
        } catch {
          return [it.id, ""] as const;
        }
      }),
    );
    const add: Rec = {};
    for (const [id, text] of results) if (text) add[`w${id}`] = text;
    if (Object.keys(add).length > 0) merge(lang, add);
  }
}

async function flush(): Promise<void> {
  timer = undefined;
  const batches = [...waiting.entries()];
  waiting.clear();
  for (const [lang, map] of batches) {
    const items = [...map.entries()].map(([id, title]) => ({ id, title }));
    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK);
      let done = new Set<string>();
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang, items: chunk }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const { translations } = (await res.json()) as { translations: Record<string, string> };
        const add: Rec = {};
        for (const [id, text] of Object.entries(translations)) add[`w${id}`] = text;
        if (Object.keys(add).length > 0) merge(lang, add);
        done = new Set(Object.keys(translations));
      } catch {
        /* server gagal: lanjut ke cadangan di browser */
      }
      // Yang belum terjemah (server gagal / semua penyedia server gagal) dicoba dari browser.
      const missing = chunk.filter((c) => !done.has(String(c.id)));
      if (missing.length > 0) await fallbackInBrowser(lang, missing);
    }
  }
}

function enqueue(lang: TitleLang, works: Item[]): void {
  const done = read()[lang];
  for (const w of works) {
    const k = `${lang}:${w.id}`;
    if (busy.has(k) || done?.[`w${w.id}`] || !needsTranslation(w.title, lang)) continue;
    busy.add(k); // tetap tercatat setelah selesai, jadi tidak diminta berulang kali dalam satu sesi
    let map = waiting.get(lang);
    if (!map) waiting.set(lang, (map = new Map()));
    map.set(w.id, w.title);
  }
  if (waiting.size > 0 && timer === undefined) timer = window.setTimeout(() => void flush(), 150);
}

/** Mengembalikan fungsi `t(work)` = judul dalam bahasa terpilih (sementara judul asli sampai terjemahan datang). */
export function useTitles(works: Item[]): (w: Item) => string {
  const lang = useLang();
  const store = useSyncExternalStore(subscribe, read, () => EMPTY);

  useEffect(() => {
    if (lang !== "ja") enqueue(lang, works);
  }, [lang, works]);

  return useCallback((w: Item) => (lang === "ja" ? w.title : (store[lang]?.[`w${w.id}`] ?? w.title)), [lang, store]);
}
