// =====================================================================
// browse.ts — HANYA di sisi server. Daftar semua Tag (genre), Circle, dan Pengisi suara (VA)
// dari situs asli, plus peringkat "terpopuler" yang kita hitung sendiri.
//
// Data dari situs asli:  GET /api/tags/  ·  /api/circles/  ·  /api/vas/
//   Tiap entri punya nama, dan (biasanya) jumlah karya. Kalau jumlah karya tidak disediakan,
//   urutan "Karya terbanyak" tidak bisa dibuat dan diganti urutan "Terpopuler".
//
// "Terpopuler" = seberapa sering sebuah tag/circle/VA muncul di karya-karya populer saat ini
// (3 halaman pertama daftar populer = 60 karya). Ini hitungan kita sendiri, bukan angka resmi.
//
// Kalau daftar lengkap dari situs asli tidak bisa diambil, daftar disusun dari karya populer
// saja supaya halaman tetap berguna.
// =====================================================================
import { fetchPopular, UPSTREAM, upstreamHeaders } from "./asmr";
import type { Work } from "./types";

export type BrowseKind = "tag" | "va" | "circle";
export type BrowseSort = "az" | "count" | "pop";

export type BrowseItem = {
  value: string; // nilai untuk pencarian (tag = nama Mandarin; VA & circle = nama)
  names: { zh: string; en?: string; ja?: string };
  count: number | null; // jumlah karya (null = tidak diketahui)
  pop: number; // berapa kali muncul di karya populer
};

type Loaded = { items: BrowseItem[]; hasCount: boolean; fromSampleOnly: boolean };

const TTL = 60 * 60_000; // 1 jam
const cache = new Map<string, { at: number; data: Loaded }>();

const ENDPOINT: Record<BrowseKind, string> = { tag: "/api/tags/", va: "/api/vas/", circle: "/api/circles/" };

type Raw = Record<string, unknown>;

function num(o: Raw, keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function i18nName(o: Raw, lang: string): string | undefined {
  const i18n = o.i18n as Record<string, { name?: string }> | undefined;
  const n = i18n?.[lang]?.name;
  return typeof n === "string" && n ? n : undefined;
}

// Hitung berapa kali tiap tag / VA / circle muncul di karya populer.
async function popularityMaps() {
  const pages = await Promise.allSettled([1, 2, 3].map((p) => fetchPopular(p)));
  const works: Work[] = pages.flatMap((r) => (r.status === "fulfilled" && Array.isArray(r.value.works) ? r.value.works : []));
  const tag = new Map<string, number>();
  const va = new Map<string, number>();
  const circle = new Map<string, number>();
  const bump = (m: Map<string, number>, k?: string) => k && m.set(k, (m.get(k) ?? 0) + 1);
  for (const w of works) {
    w.tags?.forEach((t) => bump(tag, t.name));
    w.vas?.forEach((v) => bump(va, v.name));
    bump(circle, w.name);
  }
  return { works, maps: { tag, va, circle } };
}

async function load(kind: BrowseKind): Promise<Loaded> {
  const hit = cache.get(kind);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const { works, maps } = await popularityMaps();
  const pop = maps[kind];

  let items: BrowseItem[] = [];
  try {
    const res = await fetch(`${UPSTREAM}${ENDPOINT[kind]}`, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store", // daftar circle bisa besar (>2 MB), terlalu besar untuk cache bawaan Next
    });
    if (res.ok) {
      const json = (await res.json()) as unknown;
      const list = Array.isArray(json) ? (json as Raw[]) : [];
      items = list
        .filter((o) => typeof o?.name === "string" && (o.name as string).length > 0)
        .map((o) => {
          const name = o.name as string;
          return {
            value: name,
            names: { zh: i18nName(o, "zh-cn") ?? name, en: i18nName(o, "en-us"), ja: i18nName(o, "ja-jp") },
            count: num(o, ["count", "workCount", "work_count", "worksCount", "works_count", "total"]),
            pop: pop.get(name) ?? 0,
          };
        });
    }
  } catch {
    /* jatuh ke cadangan di bawah */
  }

  let fromSampleOnly = false;
  if (items.length === 0) {
    // Cadangan: susun daftar dari karya populer saja.
    fromSampleOnly = true;
    const seen = new Map<string, BrowseItem>();
    for (const w of works) {
      if (kind === "tag") {
        for (const t of w.tags ?? []) {
          seen.set(t.name, {
            value: t.name,
            names: { zh: t.i18n?.["zh-cn"]?.name || t.name, en: t.i18n?.["en-us"]?.name, ja: t.i18n?.["ja-jp"]?.name },
            count: null,
            pop: pop.get(t.name) ?? 0,
          });
        }
      } else if (kind === "va") {
        for (const v of w.vas ?? []) seen.set(v.name, { value: v.name, names: { zh: v.name }, count: null, pop: pop.get(v.name) ?? 0 });
      } else if (w.name) {
        seen.set(w.name, { value: w.name, names: { zh: w.name }, count: null, pop: pop.get(w.name) ?? 0 });
      }
    }
    items = [...seen.values()];
  }

  const data: Loaded = { items, hasCount: items.some((i) => i.count !== null), fromSampleOnly };
  if (items.length > 0) cache.set(kind, { at: Date.now(), data });
  return data;
}

// Nama yang ditampilkan sesuai bahasa (zh = Mandarin, ja = Jepang, en = Inggris; ada cadangan).
export function labelFor(n: BrowseItem["names"], lang: "ja" | "en" | "zh"): string {
  if (lang === "zh") return n.zh;
  if (lang === "ja") return n.ja || n.en || n.zh;
  return n.en || n.ja || n.zh;
}

export type BrowseQuery = { kind: BrowseKind; sort: BrowseSort; q: string; page: number; lang: "ja" | "en" | "zh" };
export type BrowseResult = {
  items: { value: string; label: string; count: number | null; pop: number }[];
  total: number;
  page: number;
  pageSize: number;
  hasCount: boolean;
  fromSampleOnly: boolean;
};

export const BROWSE_PAGE_SIZE = 60;

export async function browse({ kind, sort, q, page, lang }: BrowseQuery): Promise<BrowseResult> {
  const { items, hasCount, fromSampleOnly } = await load(kind);

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? items.filter((i) => [i.value, i.names.zh, i.names.en, i.names.ja].some((n) => n?.toLowerCase().includes(needle)))
    : items;

  const labeled = filtered.map((i) => ({ i, label: labelFor(i.names, lang) }));
  // "count" tanpa data jumlah karya diganti "pop", supaya urutannya tetap bermakna.
  const effective: BrowseSort = sort === "count" && !hasCount ? "pop" : sort;
  labeled.sort((a, b) => {
    if (effective === "az") return a.label.localeCompare(b.label, lang === "ja" ? "ja" : lang === "zh" ? "zh" : "en");
    if (effective === "count") return (b.i.count ?? -1) - (a.i.count ?? -1) || b.i.pop - a.i.pop;
    return b.i.pop - a.i.pop || (b.i.count ?? -1) - (a.i.count ?? -1) || a.label.localeCompare(b.label);
  });

  const total = labeled.length;
  const safePage = Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE)));
  const start = (safePage - 1) * BROWSE_PAGE_SIZE;
  return {
    items: labeled.slice(start, start + BROWSE_PAGE_SIZE).map(({ i, label }) => ({ value: i.value, label, count: i.count, pop: i.pop })),
    total,
    page: safePage,
    pageSize: BROWSE_PAGE_SIZE,
    hasCount,
    fromSampleOnly,
  };
}
