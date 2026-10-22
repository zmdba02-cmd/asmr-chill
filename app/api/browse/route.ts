// GET /api/browse?kind=tag|va|circle&sort=az|count|pop&q=teks&page=1&lang=en|ja|zh
// Daftar tag / pengisi suara / circle untuk halaman /tags (diurutkan & disaring di server).
import { browse, type BrowseKind, type BrowseSort } from "@/lib/browse";
import { errorResponse } from "@/lib/asmr";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const kindParam = sp.get("kind");
  const sortParam = sp.get("sort");
  const langParam = sp.get("lang");
  const kind: BrowseKind = kindParam === "va" || kindParam === "circle" ? kindParam : "tag";
  const sort: BrowseSort = sortParam === "count" || sortParam === "pop" ? sortParam : "az";
  const lang = langParam === "ja" || langParam === "zh" ? langParam : "en";
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  try {
    return Response.json(await browse({ kind, sort, q: (sp.get("q") ?? "").slice(0, 100), page, lang }));
  } catch (e) {
    return errorResponse(e);
  }
}
