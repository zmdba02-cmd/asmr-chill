import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { NowPlayingDialog } from "@/components/NowPlayingDialog";
import { PlayerProvider } from "@/components/PlayerProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASMR Pribadi",
  description: "Frontend pribadi (lokal)",
  robots: { index: false, follow: false }, // jangan diindeks mesin pencari
};

// Layout membungkus SEMUA halaman. PlayerProvider ada di sini supaya audio
// tetap berjalan saat pindah halaman.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <PlayerProvider>
          <Header />
          <main>{children}</main>
          <NowPlayingDialog />
        </PlayerProvider>
      </body>
    </html>
  );
}
