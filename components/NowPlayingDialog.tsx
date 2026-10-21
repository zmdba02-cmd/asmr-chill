"use client";

// Dialog detail yang dibuka dari bar pemutar di bawah (bukan dari daftar karya).
// Tidak memutar otomatis, supaya lagu yang sedang jalan tidak diulang dari awal.

import { usePlayer } from "./PlayerProvider";
import { WorkDialog } from "./WorkDialog";

export function NowPlayingDialog() {
  const { viewing, closeDetail } = usePlayer();
  return <WorkDialog work={viewing} onClose={closeDetail} />;
}
