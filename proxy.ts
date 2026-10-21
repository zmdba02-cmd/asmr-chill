// proxy.ts — penjaga pintu untuk SEMUA halaman dan API (di Next.js 16 namanya "proxy",
// dulu "middleware"). Kalau variabel APP_PASSWORD diisi (di hosting), pengunjung harus
// memasukkan password lewat kotak login bawaan browser. Kalau kosong (di laptop sendiri), tidak ada login.
// Nama pengguna bebas; yang dicek hanya password-nya.
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const digest = (s: string) => createHash("sha256").update(s).digest();

export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const given = decoded.slice(decoded.indexOf(":") + 1);
    // Bandingkan hash-nya dengan timingSafeEqual supaya tidak bocor lewat selisih waktu.
    if (timingSafeEqual(digest(given), digest(password))) return NextResponse.next();
  }

  return new NextResponse("Perlu login.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ASMR Pribadi", charset="UTF-8"' },
  });
}

// Semua alamat kecuali berkas statis bawaan Next.js.
export const config = { matcher: "/((?!_next/static|_next/image|favicon.ico).*)" };
