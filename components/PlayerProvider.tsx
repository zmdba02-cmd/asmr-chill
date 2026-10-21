"use client";

// =====================================================================
// PlayerProvider — pemutar audio yang menempel di bawah layar.
//
// Dipasang di app/layout.tsx, jadi tidak ikut hilang saat berpindah halaman
// (musik tetap jalan waktu kamu pindah dari "Jelajah" ke "Favorit").
// Komponen lain memanggilnya lewat hook `usePlayer().play(...)`.
// "use client" di atas = komponen ini jalan di browser (butuh state & <audio>).
// =====================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { coverUrl } from "@/lib/format";
import { useTitles } from "@/lib/titles";
import { clearPosition, readPosition, savePosition } from "@/lib/positions";
import { markWatchDone, updateWatchProgress } from "@/lib/watchLater";
import type { AudioNode, Work } from "@/lib/types";

type PlayerApi = {
  current: AudioNode | null;
  currentWork: Work | null; // karya yang sedang diputar (untuk membuka ulang detailnya dari bar bawah)
  play: (node: AudioNode, queue: AudioNode[], work?: Work) => void;
  pause: () => void; // dipakai saat video dibuka, supaya suaranya tidak tabrakan
  viewing: Work | null; // karya yang detailnya sedang dibuka dari bar bawah
  openDetail: (work: Work) => void;
  closeDetail: () => void;
};

const PlayerContext = createContext<PlayerApi | null>(null);

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer harus dipakai di dalam <PlayerProvider>");
  return ctx;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const queueRef = useRef<AudioNode[]>([]); // antrean = file audio di folder yang sama
  const resumeAt = useRef(0);
  const lastSave = useRef(0);

  const [current, setCurrent] = useState<AudioNode | null>(null);
  const [currentWork, setCurrentWork] = useState<Work | null>(null);
  const [viewing, setViewing] = useState<Work | null>(null);
  const [speed, setSpeed] = useState(1);
  const [sleepMin, setSleepMin] = useState(0);
  const [error, setError] = useState("");
  const nowWork = useMemo(() => (currentWork ? [currentWork] : []), [currentWork]);
  const t = useTitles(nowWork); // judul karya di bar bawah ikut bahasa terpilih

  const play = useCallback((node: AudioNode, queue: AudioNode[], work?: Work) => {
    const audio = audioRef.current;
    if (!audio) return;
    queueRef.current = queue;
    resumeAt.current = readPosition(node.hash);
    setError("");
    setCurrent(node);
    // Track berikutnya dalam karya yang sama tidak membawa `work`, jadi pakai yang sebelumnya.
    setCurrentWork((prev) => work ?? (prev && prev.id === node.work.id ? prev : { id: node.work.id, title: node.workTitle ?? node.title }));
    // File WAV punya versi m4a ringan di streamLowQualityUrl: pakai itu kalau ada.
    const src = node.streamLowQualityUrl || node.mediaStreamUrl;
    audio.src = `/stream?url=${encodeURIComponent(src)}`;
    audio.play().catch(() => {
      /* browser kadang butuh klik sekali lagi */
    });
  }, []);

  const step = useCallback(
    (delta: number) => {
      const queue = queueRef.current;
      const index = queue.findIndex((n) => n.hash === current?.hash);
      const next = queue[index + delta];
      if (next) play(next, queue);
    },
    [current, play],
  );

  // Tombol kontrol di layar kunci HP / tombol media keyboard.
  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.workTitle ?? "",
      artwork: [{ src: coverUrl(current.work.id, "main"), sizes: "480x480" }],
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
    navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
  }, [current, step]);

  // Kecepatan putar.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.defaultPlaybackRate = speed;
    audio.playbackRate = speed;
  }, [speed]);

  // Timer tidur.
  useEffect(() => {
    if (sleepMin <= 0) return;
    const id = window.setTimeout(() => {
      audioRef.current?.pause();
      setSleepMin(0);
    }, sleepMin * 60_000);
    return () => window.clearTimeout(id);
  }, [sleepMin]);

  const pause = useCallback(() => audioRef.current?.pause(), []);
  const openDetail = useCallback((work: Work) => setViewing(work), []);
  const closeDetail = useCallback(() => setViewing(null), []);

  const api = useMemo<PlayerApi>(
    () => ({ current, currentWork, play, pause, viewing, openDetail, closeDetail }),
    [current, currentWork, play, pause, viewing, openDetail, closeDetail],
  );

  return (
    <PlayerContext.Provider value={api}>
      {children}

      <footer className="player" hidden={!current}>
        {/* Klik bar ini untuk membuka lagi detail karya yang sedang diputar */}
        <button
          type="button"
          className="now-btn"
          title="Buka detail karya"
          disabled={!currentWork}
          onClick={() => currentWork && openDetail(currentWork)}
        >
          {currentWork && <img className="np-cover" src={coverUrl(currentWork.id)} alt="" />}
          <span className="np-text">
            <span className="now">{current?.title ?? "—"}</span>
            {(currentWork || current?.workTitle) && (
              <span className="meta np-work">{currentWork ? t(currentWork) : current?.workTitle}</span>
            )}
          </span>
          <span className="np-open">Detail ⌃</span>
        </button>
        {error && <div className="meta err">{error}</div>}

        <audio
          ref={audioRef}
          controls
          preload="metadata"
          onLoadedMetadata={(e) => {
            const audio = e.currentTarget;
            audio.defaultPlaybackRate = speed;
            audio.playbackRate = speed;
            // Lanjut dari posisi terakhir (kalau bukan di awal/akhir banget).
            const at = resumeAt.current;
            if (at > 5 && at < audio.duration - 10) audio.currentTime = at;
            resumeAt.current = 0;
          }}
          onTimeUpdate={(e) => {
            if (!current || Date.now() - lastSave.current < 5000) return; // simpan tiap ~5 detik
            lastSave.current = Date.now();
            const t = e.currentTarget.currentTime;
            savePosition(current.hash, t);
            // Kalau karya ini ada di "Tonton nanti", catat track & menit terakhirnya.
            updateWatchProgress(current.work.id, {
              hash: current.hash,
              title: current.title,
              position: t,
              duration: e.currentTarget.duration || current.duration,
            });
          }}
          onEnded={() => {
            if (current) clearPosition(current.hash);
            // Track terakhir di antrean selesai -> tandai "Sudah ditonton" (kalau ada di Tonton nanti).
            const queue = queueRef.current;
            const index = queue.findIndex((n) => n.hash === current?.hash);
            if (current && !queue[index + 1]) markWatchDone(current.work.id);
            step(1); // otomatis lanjut ke track berikutnya
          }}
          onError={() => {
            if (current) setError("Audio gagal diputar (server menolak atau link kedaluwarsa). Coba buka ulang karyanya.");
          }}
        />

        <div className="pctl">
          <button type="button" title="Sebelumnya" onClick={() => step(-1)}>
            ⏮
          </button>
          <button type="button" title="Berikutnya" onClick={() => step(1)}>
            ⏭
          </button>
          <label>
            Kecepatan
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
              <option value={1.25}>1.25×</option>
              <option value={1.5}>1.5×</option>
            </select>
          </label>
          <label>
            Timer tidur
            <select value={sleepMin} onChange={(e) => setSleepMin(Number(e.target.value))}>
              <option value={0}>Mati</option>
              <option value={15}>15 menit</option>
              <option value={30}>30 menit</option>
              <option value={60}>60 menit</option>
            </select>
          </label>
        </div>
      </footer>
    </PlayerContext.Provider>
  );
}
