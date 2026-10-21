// =====================================================================
// media.ts — membedakan file audio asli dari file video.
//
// API asmr.one kadang menandai file .mp4 sebagai "audio". Kalau dimasukkan ke <audio>, yang
// terdengar cuma suaranya. Jadi jenis file ditentukan dari akhiran namanya, bukan dari `type`.
// =====================================================================
import type { AudioNode, TrackNode } from "./types";

const VIDEO_EXT = /\.(mp4|webm|m4v|mov)$/i;

// File video yang bisa diputar browser (apa pun `type` dari API, selain folder).
export const isVideoFile = (n: TrackNode): boolean =>
  n.type !== "folder" && (VIDEO_EXT.test(n.title) || VIDEO_EXT.test(n.mediaDownloadUrl?.split("?")[0] ?? ""));

// Audio sungguhan: bertipe audio DAN bukan video. Dipakai untuk antrean pemutar & putar otomatis.
export const isAudioTrack = (n: TrackNode): n is AudioNode => n.type === "audio" && !isVideoFile(n);
