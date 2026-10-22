// Barisan "Populer" di paling atas beranda. Server Component: datanya diambil di server
// (lib/asmr.ts → fetchPopular, di-cache 30 menit). Kalau gagal, barisan ini tidak tampil
// dan sisa beranda tetap normal.
import Link from "next/link";
import { fetchPopular } from "@/lib/asmr";
import type { Work } from "@/lib/types";
import { WorkGrid } from "./WorkGrid";

export async function PopularRow() {
  let works: Work[];
  try {
    works = (await fetchPopular(1)).works;
  } catch {
    return null;
  }
  if (works.length === 0) return null;

  return (
    <section className="popular">
      <div className="row-head">
        <h2>🔥 Populer</h2>
        <Link href="/?order=dl_count">Lihat semua →</Link>
      </div>
      <WorkGrid works={works} variant="row" />
    </section>
  );
}
