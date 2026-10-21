// =====================================================================
// types.ts — "bentuk" data dari API asmr.one.
//
// TypeScript membuat kita menulis bentuk data sekali di sini. Setelah itu
// editor akan mengingatkan kalau kita salah ketik nama field atau lupa
// menangani nilai yang bisa kosong (tanda "?" = boleh tidak ada).
// Hanya field yang kita pakai yang ditulis; sisanya diabaikan.
// =====================================================================

export type Tag = {
  id: number;
  name: string;
  i18n?: Record<string, { name?: string }>; // nama tag per bahasa: "en-us", "ja-jp", "zh-cn"
};

export type VoiceActor = { id?: string; name: string };

export type Work = {
  id: number;
  title: string;
  name?: string; // nama circle
  source_id?: string; // kode RJ, mis. "RJ01716786"
  source_url?: string; // halaman DLsite
  vas?: VoiceActor[];
  tags?: Tag[];
  rate_average_2dp?: number | null;
  duration?: number | null; // detik
  has_subtitle?: boolean;
  release?: string; // tanggal rilis "2026-09-20"
  create_date?: string; // tanggal ditambahkan ke situs "2026-10-20"
  dl_count?: number;
  price?: number;
};

export type WorksResponse = {
  works: Work[];
  pagination: { currentPage: number; pageSize: number; totalCount: number };
};

// Pohon file milik satu karya (/api/tracks/<id>).
// "Union type": sebuah node bisa berupa audio, folder, atau jenis lain.
// Kalau kita cek `node.type === "audio"`, TypeScript otomatis tahu
// field apa saja yang boleh dipakai (inilah yang disebut "narrowing").
export type AudioNode = {
  type: "audio";
  hash: string;
  title: string;
  duration?: number;
  size?: number;
  mediaStreamUrl: string;
  mediaDownloadUrl?: string;
  streamLowQualityUrl?: string; // versi m4a ringan untuk file WAV
  work: { id: number };
  workTitle?: string;
};

export type FolderNode = { type: "folder"; title: string; children: TrackNode[] };

// File selain audio (gambar, teks, video omake, dll). Field alamat ada kalau API menyediakannya.
export type OtherNode = {
  type: "image" | "text" | "other";
  title: string;
  hash?: string;
  size?: number;
  mediaStreamUrl?: string;
  mediaDownloadUrl?: string;
};

export type TrackNode = AudioNode | FolderNode | OtherNode;
