// GET /api/tags  →  daftar tag situs asli (untuk saran/autocomplete).
// "Best effort": kalau situs asli tidak menjawab seperti yang diharapkan, kembalikan daftar
// kosong. Frontend tetap jalan karena kamus tag juga diisi dari karya yang kamu lihat.
import { upstreamJson } from "@/lib/asmr";
import type { Tag } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await upstreamJson<unknown>("/api/tags/", 86_400); // cache 1 hari
    const tags = Array.isArray(data)
      ? (data as Tag[]).filter((t) => typeof t?.name === "string" && t.name.length > 0)
      : [];
    return Response.json({ tags });
  } catch {
    return Response.json({ tags: [] });
  }
}
