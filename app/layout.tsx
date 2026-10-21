import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASMR Pribadi",
  description: "Frontend pribadi",
  robots: { index: false, follow: false }, // jangan diindeks mesin pencari
};

// Layout paling luar: hanya <html> dan <body>. Header + pemutar ada di app/(main)/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
