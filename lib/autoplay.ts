// =====================================================================
// autoplay.ts — memilih track yang diputar otomatis saat sebuah karya dibuka.
// Aturan: utamakan file WAV, kalau tidak ada pakai MP3, kalau tidak ada juga
// pakai file audio pertama yang ketemu. Antreannya = file dengan format itu di folder yang sama.
// =====================================================================

import type { AudioNode, TrackNode } from "./types";

const isAudio = (n: TrackNode): n is AudioNode => n.type === "audio";

// Format file dari akhiran nama ("01 Intro.wav" -> "wav"); cadangan: dari alamat unduhan.
function ext(n: AudioNode): string {
  const fromTitle = n.title.match(/\.([a-z0-9]{2,5})$/i)?.[1];
  const fromUrl = n.mediaDownloadUrl?.match(/\.([a-z0-9]{2,5})(?:\?|$)/i)?.[1];
  return (fromTitle ?? fromUrl ?? "").toLowerCase();
}

// Kumpulan file audio per folder, urut dari atas ke bawah.
function groups(nodes: TrackNode[], out: AudioNode[][] = []): AudioNode[][] {
  const here = nodes.filter(isAudio);
  if (here.length > 0) out.push(here);
  for (const n of nodes) if (n.type === "folder") groups(n.children, out);
  return out;
}

export function pickAutoplayTarget(tree: TrackNode[]): { node: AudioNode; queue: AudioNode[] } | null {
  const all = groups(tree);
  for (const format of ["wav", "mp3"]) {
    for (const g of all) {
      const queue = g.filter((n) => ext(n) === format);
      if (queue.length > 0) return { node: queue[0], queue };
    }
  }
  const first = all[0];
  return first ? { node: first[0], queue: first } : null;
}
