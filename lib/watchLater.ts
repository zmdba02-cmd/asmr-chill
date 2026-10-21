// =====================================================================
// watchLater.ts — daftar "Tonton nanti" (disimpan di localStorage).
//
// Tiap karya yang ditambahkan mengingat: track terakhir yang diputar + menit ke berapa.
// Kita simpan hash track (bukan link streaming) karena link streaming bisa kedaluwarsa;
// saat dilanjutkan, daftar track diambil ulang lalu track itu dicari lewat hash-nya.
// Posisi detik yang dipakai pemutar tetap dari "pos:<hash>" (lihat PlayerProvider).
// =====================================================================

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { compactWork } from "./favorites";
import { attachServerSync, pushToServer } from "./serverSync";
import type { AudioNode, TrackNode, Work } from "./types";

const KEY = "watchlater";

export type WatchEntry = {
  work: Work;
  addedAt: number;
  updatedAt: number;
  lastHash?: string; // track terakhir yang didengar
  lastTitle?: string;
  position?: number; // detik
  duration?: number; // detik
  doneAt?: number; // ada = sudah selesai ditonton (masuk tab "Sudah ditonton")
};
type WatchMap = Record<string, WatchEntry>;

const EMPTY: WatchMap = {};
let cache: WatchMap | null = null;
const listeners = new Set<() => void>();

function load(): WatchMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WatchMap) : {};
  } catch {
    return {};
  }
}

function read(): WatchMap {
  if (cache === null) cache = load();
  return cache;
}

function write(next: WatchMap): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* abaikan kalau penyimpanan diblokir */
  }
  listeners.forEach((notify) => notify());
  pushToServer(KEY, next); // salin ke server lokal (lihat serverSync.ts)
}

// Dipakai saat data dari server menggantikan cache (tidak dikirim balik ke server).
function replace(next: WatchMap): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* abaikan */
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  attachServerSync<WatchMap>({ key: KEY, get: read, replace, isEmpty: (m) => Object.keys(m).length === 0 });
  listeners.add(notify);
  // Sinkron antar tab: kalau tab lain mengubah daftar, muat ulang.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

// Tombol "Tonton nanti": kalau sudah ada di daftar -> hapus; kalau belum (atau tadinya
// sudah ditonton) -> masukkan ke daftar tonton nanti.
function toggleLater(w: Work): void {
  const map = read();
  const entry = map[w.id];
  const next: WatchMap = { ...map };
  if (entry && !entry.doneAt) {
    delete next[w.id];
  } else {
    const now = Date.now();
    next[w.id] = { ...(entry ?? { work: compactWork(w), addedAt: now }), doneAt: undefined, updatedAt: now };
  }
  write(next);
}

// Tombol "Sudah ditonton": kalau sudah ditandai -> hapus dari riwayat; kalau belum -> tandai
// (karya yang belum pernah masuk "Tonton nanti" pun bisa langsung ditandai).
function toggleDone(w: Work): void {
  const map = read();
  const entry = map[w.id];
  const next: WatchMap = { ...map };
  if (entry?.doneAt) {
    delete next[w.id];
  } else {
    const now = Date.now();
    next[w.id] = { ...(entry ?? { work: compactWork(w), addedAt: now }), doneAt: now, updatedAt: now };
  }
  write(next);
}

// Kembalikan dari "Sudah ditonton" ke "Tonton nanti".
function restore(id: number): void {
  const entry = read()[id];
  if (!entry) return;
  write({ ...read(), [id]: { ...entry, doneAt: undefined, updatedAt: Date.now() } });
}

function remove(id: number): void {
  const next: WatchMap = { ...read() };
  delete next[id];
  write(next);
}

// Dipanggil pemutar saat track terakhir selesai. Hanya untuk karya yang ada di "Tonton nanti".
export function markWatchDone(workId: number): void {
  const map = read();
  const entry = map[workId];
  if (!entry || entry.doneAt) return;
  const now = Date.now();
  write({ ...map, [workId]: { ...entry, doneAt: now, updatedAt: now } });
}

// Dipanggil pemutar tiap ~5 detik. Hanya mengubah karya yang SUDAH ada di daftar.
export function updateWatchProgress(
  workId: number,
  p: { hash: string; title: string; position: number; duration?: number },
): void {
  const map = read();
  const entry = map[workId];
  if (!entry || entry.doneAt) return; // yang sudah ditonton tidak diubah lagi
  write({
    ...map,
    [workId]: {
      ...entry,
      lastHash: p.hash,
      lastTitle: p.title,
      position: p.position,
      duration: p.duration,
      updatedAt: Date.now(),
    },
  });
}

export function useWatchLater() {
  const map = useSyncExternalStore(subscribe, read, () => EMPTY);
  const all = useMemo(() => Object.values(map), [map]);
  // Tonton nanti: yang terakhir diputar / ditambahkan di paling atas.
  const later = useMemo(() => all.filter((e) => !e.doneAt).sort((a, b) => b.updatedAt - a.updatedAt), [all]);
  // Sudah ditonton: yang paling baru selesai di paling atas.
  const done = useMemo(() => all.filter((e) => e.doneAt).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)), [all]);
  const get = useCallback((id: number) => map[id], [map]);
  return { later, done, get, toggleLater, toggleDone, restore, remove };
}

// ---- mencari track yang harus dilanjutkan di dalam pohon file ----
const isAudio = (n: TrackNode): n is AudioNode => n.type === "audio";

type Target = { node: AudioNode; queue: AudioNode[] };

function findByHash(nodes: TrackNode[], hash: string): Target | null {
  const siblings = nodes.filter(isAudio);
  const hit = siblings.find((n) => n.hash === hash);
  if (hit) return { node: hit, queue: siblings };
  for (const n of nodes) {
    if (n.type === "folder") {
      const r = findByHash(n.children, hash);
      if (r) return r;
    }
  }
  return null;
}

function firstGroup(nodes: TrackNode[]): Target | null {
  const siblings = nodes.filter(isAudio);
  if (siblings.length > 0) return { node: siblings[0], queue: siblings };
  for (const n of nodes) {
    if (n.type === "folder") {
      const r = firstGroup(n.children);
      if (r) return r;
    }
  }
  return null;
}

// Track terakhir kalau ketemu; kalau tidak (belum pernah diputar), track pertama.
export function findResumeTarget(tree: TrackNode[], lastHash?: string): Target | null {
  return (lastHash ? findByHash(tree, lastHash) : null) ?? firstGroup(tree);
}

export async function fetchResumeTarget(entry: WatchEntry): Promise<Target> {
  const res = await fetch(`/api/tracks/${entry.work.id}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Gagal (${res.status})`);
  }
  const target = findResumeTarget((await res.json()) as TrackNode[], entry.lastHash);
  if (!target) throw new Error("Karya ini tidak punya file audio");
  return target;
}
