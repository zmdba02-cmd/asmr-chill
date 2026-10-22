"use client";

// WorkGrid — deretan kartu karya. Klik kartu → buka WorkDialog.
// Dipakai di halaman Jelajah (data dari server) dan halaman Favorit (data dari localStorage).

import Link from "next/link";
import { useEffect, useState, type SyntheticEvent } from "react";
import { coverUrl, fmtTime, tagName } from "@/lib/format";
import { useLang } from "@/lib/lang";
import { learnTags } from "@/lib/tagDict";
import { useTitles } from "@/lib/titles";
import type { Work } from "@/lib/types";
import { WorkDialog } from "./WorkDialog";

type Props = {
  works: Work[];
  emptyText?: string;
  variant?: "grid" | "row"; // row = satu baris yang bisa digeser ke samping (barisan Populer)
  onRemove?: (w: Work) => void; // kalau diisi, tiap kartu punya tombol ✕ (dipakai di playlist)
  removeLabel?: string;
};

// Klik di tag/nama di dalam kartu hanya berpindah halaman, tanpa ikut membuka detail karya.
const stop = (e: SyntheticEvent) => e.stopPropagation();

export function WorkGrid({ works, emptyText = "Tidak ada hasil.", variant = "grid", onRemove, removeLabel = "Hapus" }: Props) {
  const [selected, setSelected] = useState<Work | null>(null);
  const lang = useLang();
  const t = useTitles(works); // judul sesuai bahasa terpilih

  // Setiap karya yang tampil "mengajari" kamus tag, jadi saran tag makin lengkap dengan sendirinya.
  useEffect(() => {
    learnTags(works.flatMap((w) => w.tags ?? []));
  }, [works]);

  if (works.length === 0) return <p className="status">{emptyText}</p>;

  return (
    <>
      <section className={variant === "row" ? "grid row" : "grid"}>
        {works.map((w) => (
          <article
            key={w.id}
            className="card"
            role="button"
            tabIndex={0}
            onClick={() => setSelected(w)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSelected(w);
            }}
          >
            {/* <img> biasa: sampul sudah lewat proxy lokal kita */}
            <img className="cover" loading="lazy" src={coverUrl(w.id)} alt="" />
            {onRemove && (
              <button
                type="button"
                className="rm"
                title={removeLabel}
                aria-label={`${removeLabel}: ${w.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(w);
                }}
              >
                ✕
              </button>
            )}
            <div className="body">
              <div className="title" title={w.title}>
                {t(w)}
              </div>
              <div className="meta">
                {w.source_id} {w.rate_average_2dp ? `★ ${w.rate_average_2dp}` : ""}
                {w.duration ? ` · ${fmtTime(w.duration)}` : ""}
              </div>
              <div className="meta">
                {w.vas?.map((v, i) => (
                  <span key={v.id ?? v.name}>
                    {i > 0 && ", "}
                    <Link href={`/?va=${encodeURIComponent(v.name)}`} className="inlink" onClick={stop} onKeyDown={stop}>
                      {v.name}
                    </Link>
                  </span>
                ))}
              </div>
              <div className="tags">
                {w.tags?.slice(0, 4).map((tg) => (
                  <Link key={tg.id} href={`/?inc=${encodeURIComponent(tg.name)}`} className="tag" onClick={stop} onKeyDown={stop}>
                    {tagName(tg, lang)}
                  </Link>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <WorkDialog work={selected} autoPlay onClose={() => setSelected(null)} />
    </>
  );
}
