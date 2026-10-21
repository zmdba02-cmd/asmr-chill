// POST /api/translate  { lang: "en" | "zh", items: [{ id, title }] }  ->  { translations: { "<id>": "..." } }
//
// Menerjemahkan judul karya. Dua cara, dipilih otomatis:
//   - Kalau GOOGLE_TRANSLATE_API_KEY diisi: Google Cloud Translation resmi (gratis 500 ribu huruf/bulan).
//   - Kalau kosong: endpoint web Google Translate yang tidak resmi (tanpa kunci; bisa dibatasi
//     atau berubah sewaktu-waktu — cukup untuk pemakaian pribadi).
// Hasil disimpan di memori server supaya judul yang sama tidak diterjemahkan dua kali.
import { needsTranslation, type TitleLang } from "@/lib/titleLang";

export const dynamic = "force-dynamic";

const TARGET: Record<TitleLang, string> = { en: "en", zh: "zh-CN" };
const MAX_ITEMS = 40;
const MAX_TITLE = 300;
const MAX_CACHE = 5000;

const g = globalThis as unknown as { __asmrTitleCache?: Map<string, string> };
const cache = (g.__asmrTitleCache ??= new Map<string, string>());

type Item = { id: number; title: string };

async function unofficial(text: string, tl: string): Promise<string> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.search = new URLSearchParams({ client: "gtx", sl: "auto", tl, dt: "t", q: text }).toString();
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Terjemahan gagal (${res.status})`);
  const data = (await res.json()) as unknown;
  const segments = Array.isArray(data) && Array.isArray(data[0]) ? (data[0] as unknown[]) : [];
  return segments.map((s) => (Array.isArray(s) && typeof s[0] === "string" ? s[0] : "")).join("");
}

async function official(texts: string[], tl: string, key: string): Promise<string[]> {
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts, target: tl, format: "text" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Google Translate API menjawab ${res.status}`);
  const data = (await res.json()) as { data?: { translations?: { translatedText?: string }[] } };
  return texts.map((_, i) => data.data?.translations?.[i]?.translatedText ?? "");
}

// Jalankan `fn` untuk semua item, paling banyak `limit` sekaligus.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export async function POST(req: Request) {
  let body: { lang?: unknown; items?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "JSON tidak valid" }, { status: 400 });
  }
  const lang = body.lang;
  if (lang !== "en" && lang !== "zh") return Response.json({ error: "lang harus en atau zh" }, { status: 400 });
  if (!Array.isArray(body.items) || body.items.length > MAX_ITEMS) {
    return Response.json({ error: `items harus berupa daftar, maksimal ${MAX_ITEMS}` }, { status: 400 });
  }
  const items: Item[] = body.items.filter(
    (i): i is Item =>
      typeof i === "object" && i !== null && Number.isInteger((i as Item).id) && typeof (i as Item).title === "string" &&
      (i as Item).title.length <= MAX_TITLE && needsTranslation((i as Item).title, lang),
  );

  const translations: Record<string, string> = {};
  const todo: Item[] = [];
  for (const it of items) {
    const hit = cache.get(`${lang}|${it.title}`);
    if (hit) translations[it.id] = hit;
    else todo.push(it);
  }

  if (todo.length > 0) {
    const tl = TARGET[lang];
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    try {
      const results = key
        ? await official(todo.map((t) => t.title), tl, key)
        : await mapLimit(todo, 6, (t) => unofficial(t.title, tl).catch(() => ""));
      todo.forEach((it, i) => {
        const text = results[i]?.trim();
        if (!text) return; // gagal untuk judul ini: klien tetap memakai judul asli
        translations[it.id] = text;
        if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string); // buang yang tertua
        cache.set(`${lang}|${it.title}`, text);
      });
    } catch (e) {
      console.error("[translate]", e instanceof Error ? e.message : e);
      if (Object.keys(translations).length === 0) {
        return Response.json({ error: "Penerjemah tidak bisa dihubungi" }, { status: 502 });
      }
    }
  }
  return Response.json({ translations });
}
