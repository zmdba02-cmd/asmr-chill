// =====================================================================
// asmr.ts — HANYA dipakai di sisi server (Server Component & route handler).
//
// Di sini satu-satunya tempat yang tahu alamat api.asmr.one. Karena kode ini
// jalan di server Next.js (bukan di browser), tidak ada masalah CORS.
// =====================================================================

import { PAGE_SIZE } from "./constants";
import type { WorksResponse } from "./types";

export const UPSTREAM = process.env.ASMR_API_BASE ?? "https://api.asmr.one";

// Header agar request kita mirip request dari situs aslinya.
export const upstreamHeaders: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (personal-frontend)",
  Accept: "application/json, */*",
  Referer: "https://www.asmr.one/",
  Origin: "https://www.asmr.one",
};

export class UpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Next.js menambahkan opsi `next` ke fetch (untuk cache). Kita deklarasikan tipenya sendiri.
type NextFetchInit = RequestInit & { next?: { revalidate?: number | false } };

/**
 * Ambil JSON dari API asli. Hasilnya di-cache Next.js selama `revalidate` detik
 * (default 5 menit) supaya tidak membebani situs asli.
 * `<T>` = "generic": kita beri tahu bentuk datanya, mis. upstreamJson<WorksResponse>(...).
 */
export async function upstreamJson<T>(pathAndQuery: string, revalidate = 300): Promise<T> {
  const init: NextFetchInit = {
    headers: upstreamHeaders,
    signal: AbortSignal.timeout(15_000),
    next: { revalidate },
  };
  const res = await fetch(`${UPSTREAM}${pathAndQuery}`, init);
  if (!res.ok) throw new UpstreamError(`Situs asli menjawab status ${res.status}`, res.status);
  return (await res.json()) as T;
}

export type PageQuery = {
  term: string; // teks pencarian, mis. "$tag:a$ $-tag:b$ kata" (kosong = daftar biasa tanpa pencarian)
  page: number;
  order: string;
  subtitleOnly: boolean;
};

// Satu halaman karya (PAGE_SIZE item). Kalau `term` kosong dipakai /api/works, kalau ada dipakai /api/search.
export function fetchWorksPage({ term, page, order, subtitleOnly }: PageQuery) {
  const params = new URLSearchParams({
    order,
    sort: "desc",
    page: String(page),
    pageSize: String(PAGE_SIZE),
    subtitle: subtitleOnly ? "1" : "0",
    seed: "1",
    includeTranslationWorks: "true",
  });
  // encodeURIComponent juga mengubah "/" di dalam nama tag (mis. 内射/中出) menjadi %2F; sudah diuji aman.
  const path = term ? `/api/search/${encodeURIComponent(term)}` : "/api/works";
  return upstreamJson<WorksResponse>(`${path}?${params}`);
}

// Ubah error apa pun menjadi jawaban JSON yang rapi untuk route handler.
export function errorResponse(e: unknown): Response {
  const message = e instanceof Error ? e.message : "Terjadi kesalahan";
  const status = e instanceof UpstreamError && e.status >= 400 ? e.status : 502;
  console.error("[error]", message);
  return Response.json({ error: message }, { status });
}

// ---------------------------------------------------------------------
// Karya populer (barisan "Populer" di beranda).
// Situs asli punya endpoint khusus (POST /api/recommender/popular). Kalau endpoint itu tidak
// menjawab seperti yang diharapkan, dipakai cadangan: urut berdasarkan jumlah unduhan.
// Hasil disimpan di memori server 30 menit supaya beranda tidak membebani situs asli.
// ---------------------------------------------------------------------
const POPULAR_TTL = 30 * 60_000;
const popularCache = new Map<number, { at: number; data: WorksResponse }>();

export async function fetchPopular(page = 1): Promise<WorksResponse> {
  const hit = popularCache.get(page);
  if (hit && Date.now() - hit.at < POPULAR_TTL) return hit.data;

  let data: WorksResponse;
  try {
    const res = await fetch(`${UPSTREAM}/api/recommender/popular`, {
      method: "POST",
      headers: { ...upstreamHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: " ",
        page,
        pageSize: PAGE_SIZE,
        subtitle: 0,
        localSubtitledWorks: [],
        withPlaylistStatus: [],
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) throw new UpstreamError(`Populer menjawab ${res.status}`, res.status);
    const json = (await res.json()) as Partial<WorksResponse>;
    if (!Array.isArray(json.works) || json.works.length === 0) throw new Error("Daftar populer kosong");
    data = {
      works: json.works,
      pagination: json.pagination ?? { currentPage: page, pageSize: PAGE_SIZE, totalCount: json.works.length },
    };
  } catch {
    const fallback = await fetchWorksPage({ term: "", page, order: "dl_count", subtitleOnly: false });
    // Jaga-jaga kalau situs asli membalas dengan bentuk data yang tidak terduga.
    data = { works: Array.isArray(fallback.works) ? fallback.works : [], pagination: fallback.pagination };
  }
  if (data.works.length > 0) popularCache.set(page, { at: Date.now(), data }); // jangan simpan hasil kosong
  return data;
}
