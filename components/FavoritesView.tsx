"use client";

import { useFavorites } from "@/lib/favorites";
import { WorkGrid } from "./WorkGrid";

// Daftar favorit dibaca dari localStorage, jadi harus dirender di browser.
export function FavoritesView() {
  const { list } = useFavorites();
  return (
    <>
      <p className="status">{list.length > 0 ? `${list.length} favorit` : ""}</p>
      <WorkGrid works={list} emptyText="Belum ada favorit. Buka sebuah karya lalu tekan ☆." />
    </>
  );
}
