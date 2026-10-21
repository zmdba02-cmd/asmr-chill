// GET /api/tracks/<id>  →  daftar file milik satu karya (diteruskan dari api.asmr.one)
import { errorResponse, upstreamJson } from "@/lib/asmr";
import { learnHosts } from "@/lib/hosts";
import type { TrackNode } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // di Next.js 15+, params berupa Promise
  if (!/^[A-Za-z0-9]+$/.test(id)) {
    return Response.json({ error: "id tidak valid" }, { status: 400 });
  }
  try {
    const tree = await upstreamJson<TrackNode[]>(`/api/tracks/${id}`);
    learnHosts(tree); // catat host audio supaya /stream mau meneruskannya
    return Response.json(tree);
  } catch (e) {
    return errorResponse(e);
  }
}
