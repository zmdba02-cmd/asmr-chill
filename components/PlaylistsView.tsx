"use client";

// Halaman /playlists: daftar playlist + form membuat yang baru.

import Link from "next/link";
import { useState } from "react";
import { coverUrl } from "@/lib/format";
import { MAX_PLAYLIST_NAME, createPlaylist, deletePlaylist, renamePlaylist, usePlaylists } from "@/lib/playlists";

export function PlaylistsView() {
  const { list } = usePlaylists();
  const [name, setName] = useState("");

  function create() {
    if (createPlaylist(name)) setName("");
  }

  return (
    <>
      <div className="controls">
        <input
          value={name}
          maxLength={MAX_PLAYLIST_NAME}
          placeholder="Nama playlist baru…"
          aria-label="Nama playlist baru"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
        />
        <button type="button" onClick={create}>
          ＋ Buat playlist
        </button>
      </div>

      <p className="status">
        {list.length > 0 ? `${list.length} playlist` : "Belum ada playlist. Buat satu di atas, lalu tambahkan karya lewat tombol 📂 Playlist di detail karya."}
      </p>

      <section className="pl-grid">
        {list.map((p) => (
          <article key={p.id} className="pl-card">
            <Link href={`/playlists/${p.id}`} className="pl-cover" aria-label={`Buka ${p.name}`}>
              {p.works[0] ? <img className="cover" loading="lazy" src={coverUrl(p.works[0].id)} alt="" /> : <div className="cover empty">📂</div>}
            </Link>
            <div className="body">
              <Link href={`/playlists/${p.id}`} className="title">
                {p.name}
              </Link>
              <div className="meta">{p.works.length} karya</div>
              <div className="pl-actions">
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
                    if (window.confirm(`Hapus playlist "${p.name}"? Karya di dalamnya tidak ikut terhapus dari tempat lain.`)) deletePlaylist(p.id);
                  }}
                >
                  🗑 Hapus
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
