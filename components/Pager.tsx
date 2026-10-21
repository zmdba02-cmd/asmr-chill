// Pager — tombol halaman. Ini Server Component (tanpa "use client"): hanya menghasilkan link.
import Link from "next/link";
import { PAGE_SIZE } from "@/lib/constants";

type Props = {
  page: number;
  total: number | null; // null = jumlah total tidak diketahui (hasil gabungan mode OR)
  hasNext: boolean;
  baseQuery: string; // filter saat ini tanpa nomor halaman, mis. "inc=a&exc=b"
};

export function Pager({ page, total, hasNext, baseQuery }: Props) {
  const href = (p: number): string => {
    const params = new URLSearchParams(baseQuery);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const label =
    total === null ? `Hal ${page}` : `Hal ${page} / ${Math.max(1, Math.ceil(total / PAGE_SIZE)).toLocaleString("id-ID")}`;

  return (
    <nav className="pager">
      {page > 1 ? <Link href={href(page - 1)}>← Sebelumnya</Link> : <span className="disabled">← Sebelumnya</span>}
      <span>{label}</span>
      {hasNext ? <Link href={href(page + 1)}>Berikutnya →</Link> : <span className="disabled">Berikutnya →</span>}
    </nav>
  );
}
