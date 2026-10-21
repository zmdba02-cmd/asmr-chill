// GET /stream?url=<alamat audio dari /api/tracks>
// Meneruskan audio dan header "Range" (supaya geser/seek di pemutar berfungsi).
import { errorResponse, upstreamHeaders } from "@/lib/asmr";
import { allowedHosts } from "@/lib/hosts";

export const dynamic = "force-dynamic";

const COPIED_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];

export async function GET(req: Request) {
  let target: URL;
  try {
    target = new URL(new URL(req.url).searchParams.get("url") ?? "");
  } catch {
    return Response.json({ error: "url tidak valid" }, { status: 400 });
  }
  if (target.protocol !== "https:" || !allowedHosts.has(target.hostname)) {
    return Response.json({ error: "host tidak diizinkan (buka dulu daftar track karyanya)" }, { status: 403 });
  }

  const headers: Record<string, string> = { ...upstreamHeaders, Accept: "*/*" };
  const range = req.headers.get("range");
  if (range) headers.Range = range; // penting untuk seek

  try {
    // req.signal otomatis batal kalau browser menutup koneksi (mis. pindah lagu).
    const up = await fetch(target, { headers, signal: req.signal });
    const out = new Headers();
    for (const name of COPIED_HEADERS) {
      const value = up.headers.get(name);
      if (value) out.set(name, value);
    }
    return new Response(up.body, { status: up.status, headers: out });
  } catch (e) {
    return errorResponse(e);
  }
}
