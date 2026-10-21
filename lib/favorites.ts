// =====================================================================
// favorites.ts — favorit disimpan di localStorage browser.
//
// Dibuat sebagai "store" kecil + hook `useFavorites()` (useSyncExternalStore),
// supaya semua komponen yang memakainya otomatis ikut ter-update saat favorit
// berubah, tanpa perlu muat ulang halaman.
// =====================================================================

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { attachServerSync, pushToServer } from "./serverSync";
import type { Work } from "./types";

const KEY = "favs";
type FavMap = Record<string, Work>;

const EMPTY: FavMap = {}; // dipakai saat render di server (localStorage belum ada)
let cache: FavMap | null = null;
const listeners = new Set<() => void>();

function load(): FavMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FavMap) : {};
  } catch {
    return {};
  }
}

function read(): FavMap {
  if (cache === null) cache = load();
  return cache;
}

function write(next: FavMap): void {
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
function replace(next: FavMap): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* abaikan */
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  attachServerSync<FavMap>({ key: KEY, get: read, replace, isEmpty: (m) => Object.keys(m).length === 0 });
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

// Simpan versi ringkas saja (hemat ruang).
export function compactWork(w: Work): Work {
  return {
    id: w.id,
    title: w.title,
    name: w.name,
    source_id: w.source_id,
    source_url: w.source_url,
    vas: w.vas,
    tags: w.tags?.slice(0, 6),
    rate_average_2dp: w.rate_average_2dp,
    duration: w.duration,
    has_subtitle: w.has_subtitle,
  };
}

function toggle(w: Work): void {
  const next: FavMap = { ...read() };
  if (next[w.id]) delete next[w.id];
  else next[w.id] = compactWork(w);
  write(next);
}

export function useFavorites() {
  const favs = useSyncExternalStore(subscribe, read, () => EMPTY);
  const list = useMemo(() => Object.values(favs), [favs]);
  const isFav = useCallback((id: number) => id in favs, [favs]);
  return { list, isFav, toggle };
}
