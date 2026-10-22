// =====================================================================
// filters.ts — semua aturan tentang FILTER PENCARIAN, dalam bentuk fungsi murni
// (tidak memanggil jaringan, tidak memakai React), jadi aman dipakai di server
// maupun di browser, dan mudah diuji.
//
// Cara kerja pencarian tag di API asmr.one (sudah diuji langsung):
//   $tag:NAMA$      karya HARUS punya tag ini
//   $-tag:NAMA$     karya TIDAK BOLEH punya tag ini
//   beberapa $tag:..$ sekaligus = AND (semua harus ada)
//   NAMA = nama tag dalam bahasa Mandarin sederhana, persis seperti di situs
//          (contoh: 皆大欢喜, 内射/中出). ID angka tidak berfungsi.
//   $va:NAMA$      karya dengan pengisi suara ini (nama persis seperti di situs, mis. 本渡楓)
//   $circle:NAMA$  karya dari circle ini
//   kata biasa di luar $...$ = kata kunci judul / kode RJ, boleh digabung.
// API tidak punya OR, jadi OR dibuat sendiri di lib/search.ts.
// =====================================================================

import { DEFAULT_ORDER, MAX_TAGS_PER_LIST, ORDER_OPTIONS } from "./constants";

export type MatchMode = "and" | "or";

export type Filters = {
  q: string; // kata kunci bebas
  inc: string[]; // tag yang disertakan (nama Mandarin)
  exc: string[]; // tag yang dikecualikan
  va: string[]; // pengisi suara (nama)
  circle: string[]; // circle / pembuat (nama)
  mode: MatchMode; // cara mencocokkan tag "inc": semua (and) atau salah satu (or)
  order: string;
  sub: boolean; // hanya yang ada subtitle
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

// Query string bisa berupa satu nilai atau array (kalau parameternya diulang: ?inc=a&inc=b).
const toArray = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// Tanda "$" dibuang dari nama tag supaya tidak bisa merusak sintaks pencarian.
export const cleanTag = (raw: string): string => raw.replace(/\$/g, "").trim();

// Bersihkan, buang duplikat dan yang kosong, lalu batasi jumlahnya.
export function normalizeTags(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const tag = cleanTag(raw);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS_PER_LIST) break;
  }
  return out;
}

// Alamat web (?inc=...&exc=...) -> objek Filters.
export function parseFilters(sp: RawParams): Filters {
  const first = (key: string): string => toArray(sp[key])[0] ?? "";
  const orderParam = first("order");
  const exc = normalizeTags(toArray(sp.exc));
  // Satu tag tidak boleh ada di dua daftar sekaligus (hasilnya pasti kosong): pengecualian menang.
  const inc = normalizeTags(toArray(sp.inc)).filter((t) => !exc.includes(t));
  return {
    q: first("q").trim(),
    inc,
    exc,
    va: normalizeTags(toArray(sp.va)),
    circle: normalizeTags(toArray(sp.circle)),
    mode: first("mode") === "or" ? "or" : "and",
    order: ORDER_OPTIONS.some((o) => o.value === orderParam) ? orderParam : DEFAULT_ORDER,
    sub: first("sub") === "1",
    page: Math.max(1, Number.parseInt(first("page"), 10) || 1),
  };
}

// Objek Filters -> parameter alamat web. Nilai bawaan tidak ditulis supaya URL tetap pendek.
export function filtersToParams(f: Omit<Filters, "page"> & { page?: number }): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set("q", f.q.trim());
  for (const t of f.inc) params.append("inc", t);
  for (const t of f.exc) params.append("exc", t);
  for (const v of f.va) params.append("va", v);
  for (const c of f.circle) params.append("circle", c);
  if (f.mode === "or") params.set("mode", "or");
  if (f.order !== DEFAULT_ORDER) params.set("order", f.order);
  if (f.sub) params.set("sub", "1");
  if (f.page && f.page > 1) params.set("page", String(f.page));
  return params;
}

// Filters -> teks pencarian untuk API, mis. "$tag:a$ $tag:b$ $-tag:e$ kata".
export function buildTerm({ q, inc, exc, va, circle }: Pick<Filters, "q" | "inc" | "exc" | "va" | "circle">): string {
  const parts = [
    ...inc.map((t) => `$tag:${t}$`),
    ...exc.map((t) => `$-tag:${t}$`),
    ...va.map((v) => `$va:${v}$`),
    ...circle.map((c) => `$circle:${c}$`),
  ];
  const keyword = q.trim();
  if (keyword) parts.push(keyword);
  return parts.join(" ");
}
