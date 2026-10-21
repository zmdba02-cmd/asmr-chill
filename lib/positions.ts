// =====================================================================
// positions.ts — posisi terakhir tiap track (untuk "lanjutkan").
// Dulu satu kunci localStorage per track ("pos:<hash>"); sekarang satu peta {hash: detik}
// yang ikut disalin ke server (lihat serverSync.ts). Data lama "pos:*" dimigrasi otomatis.
// =====================================================================

import { attachServerSync, pushToServer } from "./serverSync";

const KEY = "positions";
const MAX = 300; // simpan 300 track terakhir saja supaya file tidak membengkak
type PosMap = Record<string, number>;

let cache: PosMap | null = null;

function load(): PosMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as PosMap;
    // Migrasi dari format lama.
    const map: PosMap = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("pos:")) {
        const v = Number(localStorage.getItem(k));
        if (v > 0) map[k.slice(4)] = v;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function persist(next: PosMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* abaikan */
  }
}

function read(): PosMap {
  if (cache === null) {
    cache = load();
    attachServerSync<PosMap>({
      key: KEY,
      get: () => cache ?? {},
      replace: (next) => {
        cache = next;
        persist(next);
      },
      isEmpty: (m) => Object.keys(m).length === 0,
    });
  }
  return cache;
}

function write(next: PosMap): void {
  cache = next;
  persist(next);
  pushToServer(KEY, next);
}

export function readPosition(hash: string): number {
  return read()[hash] || 0;
}

export function savePosition(hash: string, seconds: number): void {
  const next = { ...read() };
  delete next[hash]; // hapus dulu supaya yang terbaru ada di urutan paling belakang
  next[hash] = Math.round(seconds);
  const keys = Object.keys(next);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX))) delete next[k];
  write(next);
}

export function clearPosition(hash: string): void {
  const cur = read();
  if (!(hash in cur)) return;
  const next = { ...cur };
  delete next[hash];
  write(next);
}
