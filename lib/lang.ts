// =====================================================================
// lang.ts — pilihan bahasa untuk nama tag: ja (Jepang), en (Inggris), zh (Mandarin).
// Disimpan di localStorage. Pola yang sama dengan lib/favorites.ts.
// Bawaan "en" (sama seperti sebelum ada pilihan bahasa).
// =====================================================================

import { useSyncExternalStore } from "react";

export type Lang = "ja" | "en" | "zh";
const KEY = "lang";
const DEFAULT: Lang = "en";

let cache: Lang | null = null;
const listeners = new Set<() => void>();

function load(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    return v === "ja" || v === "en" || v === "zh" ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}
const read = (): Lang => (cache ??= load());

export function setLang(next: Lang): void {
  cache = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* abaikan */
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
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

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}
