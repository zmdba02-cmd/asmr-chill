// =====================================================================
// hosts.ts — daftar host audio yang boleh diteruskan oleh /stream.
//
// Alamat server audio bisa berganti, jadi kita "mempelajarinya" dari jawaban
// /api/tracks. Dengan begitu /stream tidak bisa dipakai membuka alamat sembarangan.
//
// `globalThis` dipakai karena Next.js bisa memuat tiap route handler sebagai
// modul terpisah; lewat globalThis semuanya berbagi satu daftar yang sama.
// =====================================================================

import type { TrackNode } from "./types";

const g = globalThis as unknown as { __asmrAllowedHosts?: Set<string> };
export const allowedHosts: Set<string> = (g.__asmrAllowedHosts ??= new Set<string>());

function addHost(url: string | undefined): void {
  if (!url) return;
  try {
    allowedHosts.add(new URL(url).hostname);
  } catch {
    /* abaikan URL rusak */
  }
}

export function learnHosts(nodes: TrackNode[]): void {
  for (const node of nodes) {
    if (node.type === "folder") learnHosts(node.children);
    else if (node.type === "audio") {
      addHost(node.mediaStreamUrl);
      addHost(node.mediaDownloadUrl);
      addHost(node.streamLowQualityUrl);
    } else {
      // Video omake dll. ikut diputar lewat /stream, jadi host-nya juga dicatat.
      addHost(node.mediaStreamUrl);
      addHost(node.mediaDownloadUrl);
    }
  }
}
