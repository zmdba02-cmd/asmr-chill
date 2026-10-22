"use client";

// =====================================================================
// BrowseView — daftar Tag (genre) / Circle / Pengisi suara, bisa diurutkan dan dicari.
// Datanya dari /api/browse (diurutkan & disaring di server). Klik satu entri → beranda dengan
// filter itu (?inc= untuk tag, ?va= untuk pengisi suara, ?circle= untuk circle).
// =====================================================================

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

export type BrowseKind = "tag" | "va" | "circle";
type Sort = "az" | "count" | "pop";
type Result = {
  items: { value: string; label: string; count: number | null; pop: number }[];
  total: number;
  page: number;
  pageSize: number;
  hasCount: boolean;
  fromSampleOnly: boolean;
};

const PARAM: Record<BrowseKind, string> = { tag: "inc", va: "va", circle: "circle" };
const NOUN: Record<BrowseKind, string> = { tag: "tag", va: "pengisi suara", circle: "circle" };

export function BrowseView({ kind }: { kind: BrowseKind }) {
  const lang = useLang();
  const [sort, setSort] = useState<Sort>("count");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // q yang sudah "tenang" (tunggu 300 ms setelah berhenti mengetik)
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ kind, sort, q: query, page: String(page), lang });
    fetch(`/api/browse?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server menjawab ${res.status}`);
        return (await res.json()) as Result;
      })
      .then((d) => {
        if (!alive) return;
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Gagal memuat");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [kind, sort, query, page, lang]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="controls">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Cari ${NOUN[kind]}…`}
          autoComplete="off"
          aria-label={`Cari ${NOUN[kind]}`}
        />
        <select
          value={sort}
          title="Urutkan"
          onChange={(e) => {
            setSort(e.target.value as Sort);
            setPage(1);
          }}
        >
          <option value="count">Karya terbanyak</option>
          <option value="pop">Terpopuler</option>
          <option value="az">A–Z</option>
        </select>
      </div>

      {error && <p className="status err">Gagal memuat: {error}</p>}
      {data && (
        <p className="status">
          {data.total.toLocaleString("id-ID")} {NOUN[kind]}
          {sort === "count" && !data.hasCount && " · jumlah karya tidak disediakan situs, diurutkan menurut populer"}
          {sort === "pop" && " · populer = sering muncul di karya populer saat ini"}
          {data.fromSampleOnly && " · daftar lengkap dari situs tidak tersedia, ini hanya dari karya populer"}
          {loading && " · memuat…"}
        </p>
      )}
      {!data && loading && <p className="status">Memuat…</p>}

      {data && data.items.length === 0 && !loading && <p className="status">Tidak ada hasil.</p>}
      {data && data.items.length > 0 && (
        <section className="browse-grid">
          {data.items.map((it) => (
            <Link key={it.value} href={`/?${PARAM[kind]}=${encodeURIComponent(it.value)}`} className="browse-item" title={it.value}>
              <span className="bi-name">{it.label}</span>
              <span className="bi-meta">
                {it.count !== null && `${it.count.toLocaleString("id-ID")} karya`}
                {it.count !== null && it.pop > 0 && " · "}
                {it.pop > 0 && `🔥 ${it.pop}`}
              </span>
            </Link>
          ))}
        </section>
      )}

      {data && pages > 1 && (
        <nav className="pager">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Sebelumnya
          </button>
          <span>
            Hal {data.page} / {pages.toLocaleString("id-ID")}
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Berikutnya →
          </button>
        </nav>
      )}
    </>
  );
}
