"use client";

// Halaman /playlists/<id>: isi satu playlist. Tombol ✕ di kartu = keluarkan dari playlist ini saja.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePlaylist, removeFromPlaylist, renamePlaylist, usePlaylists } from "@/lib/playlists";
import { WorkGrid } from "./WorkGrid";

export function PlaylistDetail({ id }: { id: string }) {
  const router = useRouter();
  const { get } = usePlaylists();
  const p = get(id);

  if (!p) {
    return (
      <p className="status">
        Playlist tidak ditemukan. <Link href="/playlists">← Semua playlist</Link>
      </p>
    );
  }

  return (
    <>
      <div className="row-head">
        <h2>📂 {p.name}</h2>
        <span className="pl-actions">
          <Link href="/playlists">← Semua playlist</Link>
          <button
            type="button"
            onClick={() => {
              const next = window.prompt("Nama baru untuk playlist:", p.name);
              if (next) renamePlaylist(p.id, next);
            }}
          >
            ✎ Ganti nama
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Hapus playlist "${p.name}"?`)) {
                deletePlaylist(p.id);
                router.push("/playlists");
              }
            }}
          >
            🗑 Hapus
          </button>
        </span>
      </div>
      <p className="status">{p.works.length} karya</p>
      <WorkGrid
        works={p.works}
        emptyText="Playlist ini masih kosong. Buka sebuah karya lalu tekan 📂 Playlist."
        onRemove={(w) => removeFromPlaylist(p.id, w.id)}
        removeLabel="Keluarkan dari playlist"
      />
    </>
  );
}
