// =====================================================================
// playlists.ts — playlist buatan sendiri (seperti di asmr.one): kumpulan karya dengan nama.
//
// Pola yang sama dengan lib/favorites.ts: store kecil di localStorage + hook useSyncExternalStore,
// dan disalin ke server (/api/store/playlists) supaya permanen dan bisa dibuka dari perangkat lain.
// Satu karya boleh ada di banyak playlist.
// =====================================================================
import { useMemo, useSyncExternalStore } from "react";
import { compactWork } from "./favorites";
import { attachServerSync, pushToServer } from "./serverSync";
import type { Work } from "./types";

const KEY = "playlists";
export const MAX_PLAYLIST_NAME = 60;

export type Playlist = {
  id: string;
  name: string;
  created: number;
  works: Work[]; // urutan = urutan ditambahkan (yang terbaru di akhir)
};
type Store = Record<string, Playlist>;

const EMPTY: Store = {};
let cache: Store | null = null;
const listeners = new Set<() => void>();

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}
const read = (): Store => (cache ??= load());

function persist(next: Store): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* abaikan kalau penyimpanan diblokir */
  }
  listeners.forEach((notify) => notify());
}

function write(next: Store): void {
  persist(next);
  pushToServer(KEY, next);
}

function subscribe(notify: () => void): () => void {
  attachServerSync<Store>({ key: KEY, get: read, replace: persist, isEmpty: (m) => Object.keys(m).length === 0 });
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

const cleanName = (name: string): string => name.trim().slice(0, MAX_PLAYLIST_NAME);
const newId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---- operasi (fungsi biasa, boleh dipanggil dari mana saja) ----

/** Buat playlist baru; mengembalikan id-nya (atau null kalau namanya kosong). */
export function createPlaylist(name: string): string | null {
  const n = cleanName(name);
  if (!n) return null;
  const id = newId();
  write({ ...read(), [id]: { id, name: n, created: Date.now(), works: [] } });
  return id;
}

export function renamePlaylist(id: string, name: string): void {
  const n = cleanName(name);
  const p = read()[id];
  if (!p || !n) return;
  write({ ...read(), [id]: { ...p, name: n } });
}

export function deletePlaylist(id: string): void {
  const next = { ...read() };
  delete next[id];
  write(next);
}

export function addToPlaylist(id: string, work: Work): void {
  const p = read()[id];
  if (!p || p.works.some((w) => w.id === work.id)) return;
  write({ ...read(), [id]: { ...p, works: [...p.works, compactWork(work)] } });
}

export function removeFromPlaylist(id: string, workId: number): void {
  const p = read()[id];
  if (!p) return;
  write({ ...read(), [id]: { ...p, works: p.works.filter((w) => w.id !== workId) } });
}

export function usePlaylists() {
  const store = useSyncExternalStore(subscribe, read, () => EMPTY);
  const list = useMemo(() => Object.values(store).sort((a, b) => a.created - b.created), [store]);
  return { list, get: (id: string): Playlist | undefined => store[id] };
}
