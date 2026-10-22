"use client";

// Tombol "📂 Playlist" di detail karya: centang playlist mana saja yang memuat karya ini,
// atau buat playlist baru langsung dari sini.

import { useState } from "react";
import { MAX_PLAYLIST_NAME, addToPlaylist, createPlaylist, removeFromPlaylist, usePlaylists } from "@/lib/playlists";
import type { Work } from "@/lib/types";

export function PlaylistPicker({ work }: { work: Work }) {
  const { list } = usePlaylists();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const inCount = list.filter((p) => p.works.some((w) => w.id === work.id)).length;

  function create() {
    const id = createPlaylist(name);
    if (!id) return;
    addToPlaylist(id, work);
    setName("");
  }

  return (
    <div className="plpick">
      <button type="button" className={inCount > 0 ? "on" : ""} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        📂 Playlist{inCount > 0 ? ` (${inCount})` : ""}
      </button>
      {open && (
        <div className="plpanel">
          {list.length === 0 && <p className="meta">Belum ada playlist. Buat yang pertama di bawah.</p>}
          {list.map((p) => {
            const has = p.works.some((w) => w.id === work.id);
            return (
              <label key={p.id} className="plrow">
                <input type="checkbox" checked={has} onChange={() => (has ? removeFromPlaylist(p.id, work.id) : addToPlaylist(p.id, work))} />
                <span>{p.name}</span>
                <em>{p.works.length}</em>
              </label>
            );
          })}
          <div className="plnew">
            <input
              value={name}
              maxLength={MAX_PLAYLIST_NAME}
              placeholder="Playlist baru…"
              aria-label="Nama playlist baru"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
            />
            <button type="button" onClick={create} aria-label="Buat playlist dan tambahkan karya ini">
              ＋
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
