"use client";

// =====================================================================
// WorkDialog — pop-up detail karya + daftar track.
// Dibuka dari WorkGrid. Saat dibuka, ia meminta /api/tracks/<id> ke server kita.
// =====================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtTime, coverUrl, tagName } from "@/lib/format";
import { useFavorites } from "@/lib/favorites";
import { pickAutoplayTarget } from "@/lib/autoplay";
import { findResumeTarget, useWatchLater } from "@/lib/watchLater";
import { useLang } from "@/lib/lang";
import { isAudioTrack, isVideoFile } from "@/lib/media";
import { useTitles } from "@/lib/titles";
import type { AudioNode, OtherNode, TrackNode, Work } from "@/lib/types";
import { usePlayer } from "./PlayerProvider";

type Props = { work: Work | null; onClose: () => void; autoPlay?: boolean };

// Audio sungguhan (bukan video) dan file video. Aturan ada di lib/media.ts: file .mp4 selalu
// dibuka di pemutar video, walaupun API menandainya sebagai "audio".
const isAudio = isAudioTrack;
const isVideo = (n: TrackNode): n is AudioNode | OtherNode => n.type !== "folder" && isVideoFile(n);

export function WorkDialog({ work, onClose, autoPlay = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Daftar track disimpan bersama id karyanya, supaya daftar karya lain tidak sempat tampil/terputar.
  const [loaded, setLoaded] = useState<{ id: number; nodes: TrackNode[] } | null>(null);
  const autoPlayedFor = useRef<number | null>(null);
  const [error, setError] = useState("");
  const { toggle, isFav } = useFavorites();
  const watch = useWatchLater();
  const entry = work ? watch.get(work.id) : undefined;
  const { play, current, pause } = usePlayer();
  const lang = useLang();
  const workList = useMemo(() => (work ? [work] : []), [work]);
  const t = useTitles(workList);
  const [video, setVideo] = useState<{ title: string; src: string } | null>(null);
  const [videoError, setVideoError] = useState(false);
  const videoPanel = useRef<HTMLDivElement>(null);
  const workId = work?.id;
  const tree = loaded && loaded.id === workId ? loaded.nodes : null;

  // Buka/tutup elemen <dialog> mengikuti prop `work`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (work && !dialog.open) dialog.showModal();
    if (!work && dialog.open) dialog.close();
  }, [work]);

  // Ambil daftar track setiap kali karya yang dibuka berganti.
  useEffect(() => {
    if (workId === undefined) return;
    const controller = new AbortController();
    setLoaded(null);
    setVideo(null);
    setVideoError(false);
    setError("");
    fetch(`/api/tracks/${workId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Gagal (${res.status})`);
        }
        return (await res.json()) as TrackNode[];
      })
      .then((nodes) => setLoaded({ id: workId, nodes }))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Gagal memuat track");
      });
    return () => controller.abort();
  }, [workId]);

  // Putar video lewat /stream (proxy lokal yang sama dengan audio, mendukung seek).
  function openVideo(n: AudioNode | OtherNode) {
    const url = n.mediaStreamUrl || n.mediaDownloadUrl;
    if (!url) return;
    pause(); // hentikan audio supaya tidak tabrakan dengan suara video
    setVideoError(false);
    setVideo({ title: n.title, src: `/stream?url=${encodeURIComponent(url)}` });
    // Video muncul di atas daftar track: gulir ke sana supaya terlihat.
    window.setTimeout(() => videoPanel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  // Putar otomatis saat karya dibuka dari daftar: lanjut dari track terakhir (kalau ada di
  // Tonton nanti), kalau tidak, WAV pertama, kalau tidak ada MP3 pertama.
  useEffect(() => {
    if (workId === undefined) {
      autoPlayedFor.current = null; // dialog ditutup: buka lagi nanti boleh autoplay lagi
      return;
    }
    if (!autoPlay || !work || !tree || autoPlayedFor.current === workId) return;
    autoPlayedFor.current = workId;
    if (current?.work.id === workId) return; // karya ini sudah sedang diputar, jangan diulang
    const entry = watch.get(workId);
    const resume = entry && !entry.doneAt && entry.lastHash ? findResumeTarget(tree, entry.lastHash) : null;
    const target = resume ?? pickAutoplayTarget(tree);
    if (target) play(target.node, target.queue, work);
  }, [tree, workId, work, autoPlay, current, watch, play]);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose(); // klik area gelap = tutup
      }}
    >
      {work && (
        <div className="dialog-inner">
          <button type="button" className="close" aria-label="Tutup" onClick={onClose}>
            ✕
          </button>

          <div className="detail-head">
            {/* <img> biasa dipakai (bukan next/image) karena sampul sudah lewat proxy lokal kita */}
            <img className="cover" src={coverUrl(work.id, "main")} alt="" />
            <div className="detail-info">
              <h2>{t(work)}</h2>
              {t(work) !== work.title && <div className="meta">{work.title}</div>}
              <div className="meta">
                {work.name} · {work.source_id}
              </div>
              <div className="meta">{work.vas?.map((v) => v.name).join(", ")}</div>
              <div className="tags">
                {work.tags?.map((t) => (
                  <span key={t.id} className="tag">
                    {tagName(t, lang)}
                  </span>
                ))}
              </div>
              <div>
                <button type="button" onClick={() => toggle(work)}>
                  {isFav(work.id) ? "★ Favorit" : "☆ Tambah favorit"}
                </button>{" "}
                <button
                  type="button"
                  className={entry && !entry.doneAt ? "on" : ""}
                  onClick={() => watch.toggleLater(work)}
                >
                  {entry && !entry.doneAt ? "🕒 Ada di Tonton nanti" : "🕒 Tonton nanti"}
                </button>{" "}
                <button type="button" className={entry?.doneAt ? "on" : ""} onClick={() => watch.toggleDone(work)}>
                  {entry?.doneAt ? "✓ Sudah ditonton" : "✓ Tandai sudah ditonton"}
                </button>
                {entry?.lastTitle && !entry.doneAt && tree && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => {
                        const target = findResumeTarget(tree, entry?.lastHash);
                        if (target) play(target.node, target.queue, work);
                      }}
                    >
                      ▶ Lanjutkan ({fmtTime(entry?.position)})
                    </button>
                  </>
                )}
              </div>
              {work.source_url && (
                <a href={work.source_url} target="_blank" rel="noopener noreferrer">
                  Halaman DLsite ↗
                </a>
              )}
            </div>
          </div>

          {error && <p className="status err">Gagal memuat track: {error}</p>}
          {!error && tree === null && <p className="meta">Memuat daftar track…</p>}
          {video && (
            <div className="video-panel" ref={videoPanel}>
              <div className="video-head">
                <span>🎬 {video.title}</span>
                <button type="button" aria-label="Tutup video" onClick={() => setVideo(null)}>
                  ✕
                </button>
              </div>
              <video key={video.src} src={video.src} controls autoPlay playsInline onError={() => setVideoError(true)} />
              {videoError && (
                <p className="status err">
                  Video gagal diputar. Mungkin codec-nya tidak didukung browser ini, atau link kedaluwarsa (buka ulang karyanya).
                </p>
              )}
            </div>
          )}
          {tree && (
            <TrackTree
              nodes={tree}
              depth={0}
              currentHash={current?.hash}
              onPlay={(n, q) => play(n, q, work)}
              onVideo={openVideo}
            />
          )}
        </div>
      )}
    </dialog>
  );
}

type TreeProps = {
  nodes: TrackNode[];
  depth: number;
  currentHash?: string;
  onPlay: (node: AudioNode, queue: AudioNode[]) => void;
  onVideo: (node: AudioNode | OtherNode) => void;
};

// Menggambar folder & file secara rekursif (komponen memanggil dirinya sendiri untuk isi folder).
function TrackTree({ nodes, depth, currentHash, onPlay, onVideo }: TreeProps) {
  const siblings = nodes.filter(isAudio); // antrean putar = file audio satu folder
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === "folder") {
          return (
            <details key={`${node.title}-${i}`} open={depth < 1}>
              <summary>📁 {node.title}</summary>
              <div className="indent">
                <TrackTree nodes={node.children} depth={depth + 1} currentHash={currentHash} onPlay={onPlay} onVideo={onVideo} />
              </div>
            </details>
          );
        }
        if (isVideo(node) && (node.mediaStreamUrl || node.mediaDownloadUrl)) {
          return (
            <button key={node.hash ?? `${node.title}-${i}`} type="button" className="track" onClick={() => onVideo(node)}>
              <em>🎬 {node.title}</em>
              <span>{node.type === "audio" && node.duration ? fmtTime(node.duration) : "video"}</span>
            </button>
          );
        }
        if (isAudio(node)) {
          return (
            <button
              key={node.hash}
              type="button"
              className={node.hash === currentHash ? "track playing" : "track"}
              onClick={() => onPlay(node, siblings)}
            >
              <em>▶ {node.title}</em>
              <span>{fmtTime(node.duration)}</span>
            </button>
          );
        }
        return null; // gambar/teks lain tidak ditampilkan
      })}
    </>
  );
}
