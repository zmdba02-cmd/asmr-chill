// =====================================================================
// search.ts — HANYA di sisi server. Menjalankan pencarian sesuai Filters.
//
// Mode AND (atau cuma 0–1 tag): 1 permintaan saja. API asmr.one yang menyaring dan
//   membagi halaman. Pengecualian ($-tag) ikut dalam permintaan yang sama.
//
// Mode OR: API tidak mendukungnya, jadi kita rakit sendiri:
//   1. Untuk tiap tag sertaan, jalankan 1 pencarian: "$tag:itu$ + semua pengecualian".
//   2. Ambil halaman 1..N dari tiap pencarian (N = halaman yang diminta).
//   3. Gabungkan, buang duplikat (karya yang punya beberapa tag), urutkan ulang
//      sesuai pilihan urutan, lalu ambil potongan halaman N.
//   Konsekuensinya: jumlah total pasti tidak diketahui, jumlah permintaan ke situs asli
//   membesar, sehingga dibatasi MAX_OR_TAGS tag dan MAX_OR_PAGES halaman.
// =====================================================================

import { fetchWorksPage } from "./asmr";
import { MAX_OR_PAGES, MAX_OR_TAGS, PAGE_SIZE } from "./constants";
import { buildTerm, type Filters } from "./filters";
import type { Work } from "./types";

export type SearchResult = {
  works: Work[];
  total: number | null; // null = tidak diketahui (mode OR)
  hasNext: boolean;
  page: number; // halaman yang benar-benar dipakai (mode OR bisa memotong halaman terlalu jauh)
  notice: string; // catatan untuk pengguna, kosong kalau tidak ada
};

// Jalankan `fn` untuk semua item, tapi paling banyak `limit` sekaligus (sopan ke situs asli).
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Nilai yang dipakai untuk mengurutkan, sesuai pilihan "Urutkan".
function sortValue(w: Work, order: string): string | number {
  switch (order) {
    case "create_date":
      return w.create_date ?? "";
    case "release":
      return w.release ?? "";
    case "dl_count":
      return w.dl_count ?? 0;
    case "rate_average_2dp":
      return w.rate_average_2dp ?? 0;
    case "price":
      return w.price ?? 0;
    default:
      return 0;
  }
}

// Urutan menurun (terbesar/terbaru dulu); kalau sama, id yang lebih besar dulu.
function compareDesc(order: string) {
  return (a: Work, b: Work): number => {
    const va = sortValue(a, order);
    const vb = sortValue(b, order);
    if (typeof va === "string" && typeof vb === "string") {
      if (va !== vb) return va < vb ? 1 : -1;
    } else if (Number(va) !== Number(vb)) {
      return Number(vb) - Number(va);
    }
    return b.id - a.id;
  };
}

export async function searchWorks(f: Filters): Promise<SearchResult> {
  if (f.mode === "or" && f.inc.length > 1) return searchAny(f);

  const data = await fetchWorksPage({ term: buildTerm(f), page: f.page, order: f.order, subtitleOnly: f.sub });
  const total = data.pagination.totalCount;
  return { works: data.works, total, hasNext: f.page * PAGE_SIZE < total, page: f.page, notice: "" };
}

async function searchAny(f: Filters): Promise<SearchResult> {
  const tags = f.inc.slice(0, MAX_OR_TAGS);
  const page = Math.min(f.page, MAX_OR_PAGES);

  const jobs = tags.flatMap((tag) => Array.from({ length: page }, (_, i) => ({ tag, page: i + 1 })));
  const responses = await mapLimit(jobs, 4, (job) =>
    fetchWorksPage({
      term: buildTerm({ q: f.q, inc: [job.tag], exc: f.exc, va: f.va, circle: f.circle }),
      page: job.page,
      order: f.order,
      subtitleOnly: f.sub,
    }),
  );

  const byId = new Map<number, Work>(); // kunci = id karya, otomatis membuang duplikat
  let someTagHasMore = false;
  responses.forEach((res, i) => {
    for (const w of res.works) byId.set(w.id, w);
    if (jobs[i].page === page && res.pagination.totalCount > page * PAGE_SIZE) someTagHasMore = true;
  });

  const merged = [...byId.values()].sort(compareDesc(f.order));
  const start = (page - 1) * PAGE_SIZE;
  const hasMore = merged.length > page * PAGE_SIZE || someTagHasMore;

  const notes = [`Mode ATAU: hasil digabung dari ${tags.length} pencarian tag.`];
  if (f.inc.length > MAX_OR_TAGS) notes.push(`Hanya ${MAX_OR_TAGS} tag pertama yang dipakai.`);
  if (hasMore && page >= MAX_OR_PAGES) notes.push(`Dibatasi ${MAX_OR_PAGES} halaman pertama.`);

  return {
    works: merged.slice(start, start + PAGE_SIZE),
    total: null,
    hasNext: page < MAX_OR_PAGES && hasMore,
    page,
    notice: notes.join(" "),
  };
}
