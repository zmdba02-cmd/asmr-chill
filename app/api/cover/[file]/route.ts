// GET /api/cover/<id>.jpg?type=240x240  →  gambar sampul (diteruskan apa adanya)
import { UPSTREAM, errorResponse, upstreamHeaders } from "@/lib/asmr";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const type = new URL(req.url).searchParams.get("type") ?? "240x240";
  if (!/^\d+\.jpg$/.test(file) || !/^[A-Za-z0-9]+$/.test(type)) {
    return Response.json({ error: "parameter tidak valid" }, { status: 400 });
  }
  try {
    const up = await fetch(`${UPSTREAM}/api/cover/${file}?type=${type}`, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(15_000),
    });
    if (!up.ok) return new Response(null, { status: up.status });
    return new Response(up.body, {
      headers: {
        "Content-Type": up.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400", // browser menyimpan 1 hari
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
