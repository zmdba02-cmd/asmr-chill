// proxy.ts — penjaga pintu untuk SEMUA halaman dan API (di Next.js 16 namanya "proxy",
// dulu "middleware"). Kalau APP_PASSWORD diisi (di hosting), pengunjung harus login lewat
// halaman /login dulu. Kalau kosong (di laptop sendiri), tidak ada login.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (isValidSession(req.cookies.get(SESSION_COOKIE)?.value, password)) return NextResponse.next();

  // Permintaan data (fetch, gambar, audio): cukup jawab 401.
  if (pathname.startsWith("/api/") || pathname === "/stream") {
    return Response.json({ error: "Perlu login" }, { status: 401 });
  }
  // Halaman: arahkan ke /login. Proxy Next.js menolak alamat relatif, jadi alamat lengkapnya dirakit
  // dari header hosting (bukan dari req.url, yang di belakang proxy hosting bisa berisi host keliru).
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host).split(",")[0].trim();
  const local = /^(localhost|127\.|\[::1\])/.test(host);
  const proto = (req.headers.get("x-forwarded-proto") ?? (local ? "http" : "https")).split(",")[0].trim();
  const to = new URL(`/login?next=${encodeURIComponent(pathname + search)}`, `${proto}://${host}`);
  return NextResponse.redirect(to, 307);
}

// Semua alamat kecuali berkas statis bawaan Next.js.
export const config = { matcher: "/((?!_next/static|_next/image|favicon.ico).*)" };
