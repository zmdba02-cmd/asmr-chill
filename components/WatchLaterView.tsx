"use client";

// Halaman "Tonton nanti" dengan dua tab:
//  - Tonton nanti   : karya yang belum selesai, dengan track & menit terakhir + tombol Lanjutkan.
//  - Sudah ditonton : riwayat karya yang sudah selesai, supaya tidak lupa mana yang pernah didengar.

import { useMemo, useState } from "react";
import { coverUrl, fmtTime } from "@/lib/format";
import { useTitles } from "@/lib/titles";
import { fetchResumeTarget, useWatchLater, type WatchEntry } from "@/lib/watchLater";
import type { Work } from "@/lib/types";
import { usePlayer } from "./PlayerProvider";
import { WorkDialog } from "./WorkDialog";

type Tab = "later" | "done";

const fmtDate = (ms?: number) =>
  ms ? new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";

export function WatchLaterView() {
  const { later, done, toggleDone, restore, remove } = useWatchLater();
  const { play } = usePlayer();
  const [tab, setTab] = useState<Tab>("later");
  const [selected, setSelected] = useState<Work | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const list = tab === "later" ? later : done;
  const works = useMemo(() => [...later, ...done].map((e) => e.work), [later, done]);
  const t = useTitles(works);

  async function resume(entry: WatchEntry) {
    setBusyId(entry.work.id);
    setError("");
    try {
      const { node, queue } = await fetchResumeTarget(entry);
      play(node, queue, entry.work); // pemutar otomatis lompat ke posisi terakhir track ini
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal melanjutkan");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="wl-tabs">
        <button type="button" className={tab === "later" ? "on" : ""} onClick={() => setTab("later")}>
          🕒 Tonton nanti ({later.length})
        </button>
        <button type="button" className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>
          ✓ Sudah ditonton ({done.length})
        </button>
      </div>

      {error && <p className="status err">{error}</p>}
      {list.length === 0 && (
        <p className="status">
          {tab === "later"
            ? "Belum ada. Buka sebuah karya lalu tekan 🕒 Tonton nanti."
            : "Belum ada. Karya pindah ke sini saat track terakhirnya selesai, atau tekan ✓ Tandai sudah ditonton."}
        </p>
      )}

      <section className="wl-list">
        {list.map((e) => {
          const pct = e.position && e.duration ? Math.min(100, (e.position / e.duration) * 100) : 0;
          return (
            <article key={e.work.id} className="wl-item">
              <img className="cover" loading="lazy" src={coverUrl(e.work.id)} alt="" onClick={() => setSelected(e.work)} />
              <div className="wl-body">
                <div className="title" title={e.work.title}>
                  {t(e.work)}
                </div>
                <div className="meta">{e.work.source_id}</div>

                {tab === "later" ? (
                  e.lastTitle ? (
                    <>
                      <div className="meta">
                        Terakhir: {e.lastTitle} · {fmtTime(e.position)}
                        {e.duration ? ` / ${fmtTime(e.duration)}` : ""}
                      </div>
                      <div className="wl-bar">
                        <div style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  ) : (
                    <div className="meta">Belum diputar</div>
                  )
                ) : (
                  <div className="meta">Selesai {fmtDate(e.doneAt)}</div>
                )}

                <div className="wl-actions">
                  {tab === "later" ? (
                    <>
                      <button type="button" className="on" disabled={busyId === e.work.id} onClick={() => resume(e)}>
                        {busyId === e.work.id ? "Memuat…" : e.lastTitle ? "▶ Lanjutkan" : "▶ Putar"}
                      </button>
                      <button type="button" onClick={() => toggleDone(e.work)}>
                        ✓ Sudah ditonton
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => restore(e.work.id)}>
                      ↩ Tonton lagi
                    </button>
                  )}
                  <button type="button" onClick={() => setSelected(e.work)}>
                    Detail
                  </button>
                  <button
                    type="button"
                    title={tab === "later" ? "Hapus dari Tonton nanti" : "Hapus dari riwayat"}
                    onClick={() => remove(e.work.id)}
                  >
                    ✕ Hapus
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <WorkDialog work={selected} onClose={() => setSelected(null)} />
    </>
  );
}
