// Halaman utama (/) — Server Component: berjalan di server, boleh langsung `await` data.
// Tidak ada useState/useEffect di sini; datanya diambil sebelum halaman dikirim ke browser.
import { Pager } from "@/components/Pager";
import { SearchBar } from "@/components/SearchBar";
import { WorkGrid } from "@/components/WorkGrid";
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

  return (
    <>
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
