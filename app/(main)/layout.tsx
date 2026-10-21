import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { NowPlayingDialog } from "@/components/NowPlayingDialog";
import { PlayerProvider } from "@/components/PlayerProvider";

// Layout untuk semua halaman utama (Jelajah, Favorit, Tonton nanti). PlayerProvider ada di sini
// supaya audio tetap berjalan saat pindah halaman. Halaman /login sengaja di luar grup ini
// (tanpa header & pemutar).
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <PlayerProvider>
      <Header />
      <main>{children}</main>
      <NowPlayingDialog />
    </PlayerProvider>
  );
}
