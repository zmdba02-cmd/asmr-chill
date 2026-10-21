"use client";

// WorkGrid — deretan kartu karya. Klik kartu → buka WorkDialog.
// Dipakai di halaman Jelajah (data dari server) dan halaman Favorit (data dari localStorage).

import { useEffect, useState } from "react";
import { coverUrl, fmtTime, tagName } from "@/lib/format";
import { useLang } from "@/lib/lang";
import { learnTags } from "@/lib/tagDict";
import { useTitles } from "@/lib/titles";
import type { Work } from "@/lib/types";
import { WorkDialog } from "./WorkDialog";

type Props = { works: Work[]; emptyText?: string };

export function WorkGrid({ works, emptyText = "Tidak ada hasil." }: Props) {
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
      <section className="grid">
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
            <div className="body">
              <div className="title" title={w.title}>
                {t(w)}
              </div>
              <div className="meta">
                {w.source_id} {w.rate_average_2dp ? `★ ${w.rate_average_2dp}` : ""}
                {w.duration ? ` · ${fmtTime(w.duration)}` : ""}
              </div>
              <div className="meta">{w.vas?.map((v) => v.name).join(", ")}</div>
              <div className="tags">
                {w.tags?.slice(0, 4).map((t) => (
                  <span key={t.id} className="tag">
                    {tagName(t, lang)}
                  </span>
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
