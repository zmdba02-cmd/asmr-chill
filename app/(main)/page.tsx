// Halaman utama (/) — Server Component: berjalan di server, boleh langsung `await` data.
// Tidak ada useState/useEffect di sini; datanya diambil sebelum halaman dikirim ke browser.
import { Suspense } from "react";
import { Pager } from "@/components/Pager";
import { PopularRow } from "@/components/PopularRow";
import { SearchBar } from "@/components/SearchBar";
import { WorkGrid } from "@/components/WorkGrid";
import { DEFAULT_ORDER } from "@/lib/constants";
import { filtersToParams, parseFilters } from "@/lib/filters";
import { searchWorks, type SearchResult } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams; // di Next.js 15+, searchParams berupa Promise
  const filters = parseFilters(sp); // alamat web -> objek filter (q, inc, exc, mode, order, ...)

  let result: SearchResult | null = null;
  let error = "";
  try {
    result = await searchWorks(filters);
  } catch (e) {
    error = e instanceof Error ? e.message : "Gagal memuat data";
  }

  // Filter saat ini tanpa nomor halaman: dipakai tombol halaman dan sebagai `key` form.
  const baseQuery = filtersToParams({ ...filters, page: 1 }).toString();

  // Barisan Populer hanya di beranda polos: halaman 1, tanpa pencarian/filter, urutan bawaan.
  const plainHome =
    filters.page === 1 &&
    !filters.q &&
    !filters.sub &&
    filters.order === DEFAULT_ORDER &&
    filters.inc.length + filters.exc.length + filters.va.length + filters.circle.length === 0;

  return (
    <>
      {plainHome && (
        <>
          {/* Suspense: barisan populer boleh menyusul, daftar di bawahnya tidak ikut menunggu */}
          <Suspense fallback={<p className="status">Memuat populer…</p>}>
            <PopularRow />
          </Suspense>
          <div className="row-head">
            <h2>🎧 Jelajah</h2>
          </div>
        </>
      )}

      {/* `key` membuat form dibuat ulang kalau URL berubah (mis. tombol Back) */}
      <SearchBar key={baseQuery} defaults={filters} />

      {error && <p className="status err">Gagal memuat: {error}</p>}
      {result && (
        <>
          <p className="status">
            {result.total !== null ? `${result.total.toLocaleString("id-ID")} karya` : "Hasil gabungan"}
            {result.notice && ` · ${result.notice}`}
          </p>
          <WorkGrid works={result.works} />
          <Pager page={result.page} total={result.total} hasNext={result.hasNext} baseQuery={baseQuery} />
        </>
      )}
    </>
  );
}
