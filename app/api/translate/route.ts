// POST /api/translate  { lang: "en" | "zh", items: [{ id, title }] }
//   -> { translations: { "<id>": "..." }, failed: [<id>...], errors?: ["penyedia: alasan"] }
// GET  /api/translate?test=1  -> mencoba tiap penyedia dengan satu kalimat contoh (untuk diagnosa).
//
// Menerjemahkan judul karya. Penyedia dicoba berurutan; judul yang belum terjemah diteruskan ke
// penyedia berikutnya:
//   1. Google Cloud Translation resmi  — hanya kalau GOOGLE_TRANSLATE_API_KEY diisi (paling stabil).
//   2. Microsoft Edge Translate        — tanpa kunci, umumnya tidak memblokir IP server hosting.
//   3. Google Translate versi web      — tanpa kunci; sering diblokir dari IP hosting.
// Judul yang gagal di semua penyedia dilaporkan di `failed`; browser lalu mencoba sendiri
// (lihat lib/titles.ts). Hasil disimpan di memori server supaya tidak diterjemahkan dua kali.
import { needsTranslation, type TitleLang } from "@/lib/titleLang";

export const dynamic = "force-dynamic";

const GOOGLE_LANG: Record<TitleLang, string> = { en: "en", zh: "zh-CN" };
const EDGE_LANG: Record<TitleLang, string> = { en: "en", zh: "zh-Hans" };
const MAX_ITEMS = 40;
const MAX_TITLE = 300;
const MAX_CACHE = 5000;
const TIMEOUT = 8_000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const g = globalThis as unknown as { __asmrTitleCache?: Map<string, string> };
const cache = (g.__asmrTitleCache ??= new Map<string, string>());

type Item = { id: number; title: string };
type Provider = { name: string; run: (texts: string[], lang: TitleLang) => Promise<string[]> };

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

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

// ---------- penyedia 1: Google Cloud Translation resmi ----------
async function googleApi(texts: string[], lang: TitleLang): Promise<string[]> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY as string;
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts, target: GOOGLE_LANG[lang], format: "text" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { data?: { translations?: { translatedText?: string }[] } };
  return texts.map((_, i) => data.data?.translations?.[i]?.translatedText ?? "");
}

// ---------- penyedia 2: Microsoft Edge Translate ----------
let edgeToken: { value: string; exp: number } | null = null;

async function getEdgeToken(force = false): Promise<string> {
  if (!force && edgeToken && Date.now() < edgeToken.exp - 30_000) return edgeToken.value;
  const res = await fetch("https://edge.microsoft.com/translate/auth", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`auth HTTP ${res.status}`);
  const value = (await res.text()).trim();
  if (!value) throw new Error("auth kosong");
  let exp = Date.now() + 8 * 60_000; // cadangan kalau masa berlaku token tidak terbaca
  try {
    const payload = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8")) as { exp?: number };
    if (typeof payload.exp === "number") exp = payload.exp * 1000;
  } catch {
    /* pakai cadangan */
  }
  edgeToken = { value, exp };
  return value;
}

async function edge(texts: string[], lang: TitleLang): Promise<string[]> {
  const url = `https://api-edge.cognitive.microsofttranslator.com/translate?${new URLSearchParams({ "api-version": "3.0", to: EDGE_LANG[lang] })}`;
  const call = async (token: string) =>
    fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify(texts.map((Text) => ({ Text }))),
      signal: AbortSignal.timeout(TIMEOUT),
    });
  let res = await call(await getEdgeToken());
  if (res.status === 401) res = await call(await getEdgeToken(true)); // token kedaluwarsa: minta yang baru
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { translations?: { text?: string }[] }[];
  return texts.map((_, i) => data[i]?.translations?.[0]?.text ?? "");
}

// ---------- penyedia 3: Google Translate versi web ----------
async function googleWebOne(text: string, lang: TitleLang): Promise<string> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.search = new URLSearchParams({ client: "gtx", sl: "auto", tl: GOOGLE_LANG[lang], dt: "t", q: text }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as unknown;
  const segments = Array.isArray(data) && Array.isArray(data[0]) ? (data[0] as unknown[]) : [];
  return segments.map((s) => (Array.isArray(s) && typeof s[0] === "string" ? s[0] : "")).join("");
}

async function googleWeb(texts: string[], lang: TitleLang): Promise<string[]> {
  let firstError: unknown;
  const out = await mapLimit(texts, 6, (t) =>
    googleWebOne(t, lang).catch((e: unknown) => {
      firstError ??= e;
      return "";
    }),
  );
  if (out.every((x) => !x) && firstError) throw firstError; // semuanya gagal: laporkan alasannya
  return out;
}

const providers: Provider[] = [
  ...(process.env.GOOGLE_TRANSLATE_API_KEY ? [{ name: "google-api", run: googleApi }] : []),
  { name: "edge", run: edge },
  { name: "google-web", run: googleWeb },
];

// Terjemahkan `texts`; yang gagal di satu penyedia dicoba di penyedia berikutnya.
async function translateAll(texts: string[], lang: TitleLang): Promise<{ out: string[]; errors: string[] }> {
  const out = texts.map(() => "");
  const errors: string[] = [];
  for (const p of providers) {
    const pending = out.flatMap((v, i) => (v ? [] : [i]));
    if (pending.length === 0) break;
    try {
      const res = await p.run(pending.map((i) => texts[i]), lang);
      res.forEach((v, k) => {
        if (v && v.trim()) out[pending[k]] = v.trim();
      });
    } catch (e) {
      errors.push(`${p.name}: ${errText(e)}`);
    }
  }
  return { out, errors };
}

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("test") !== "1") return Response.json({ error: "gunakan ?test=1" }, { status: 400 });
  const sample = "耳かきとマッサージで癒されるASMR";
  const report: Record<string, string> = {};
  for (const p of providers) {
    try {
      const [text] = await p.run([sample], "en");
      report[p.name] = text ? `OK → ${text}` : "GAGAL: jawaban kosong";
    } catch (e) {
      report[p.name] = `GAGAL: ${errText(e)}`;
    }
  }
  return Response.json({ sample, providers: report });
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
      typeof i === "object" &&
      i !== null &&
      Number.isInteger((i as Item).id) &&
      typeof (i as Item).title === "string" &&
      (i as Item).title.length <= MAX_TITLE &&
      needsTranslation((i as Item).title, lang),
  );

  const translations: Record<string, string> = {};
  const todo: Item[] = [];
  for (const it of items) {
    const hit = cache.get(`${lang}|${it.title}`);
    if (hit) translations[it.id] = hit;
    else todo.push(it);
  }

  const failed: number[] = [];
  let errors: string[] = [];
  if (todo.length > 0) {
    const result = await translateAll(todo.map((t) => t.title), lang);
    errors = result.errors;
    todo.forEach((it, i) => {
      const text = result.out[i];
      if (!text) {
        failed.push(it.id);
        return;
      }
      translations[it.id] = text;
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string); // buang yang tertua
      cache.set(`${lang}|${it.title}`, text);
    });
    if (errors.length > 0) console.error("[translate]", errors.join(" | "));
  }
  return Response.json({ translations, failed, ...(errors.length > 0 ? { errors } : {}) });
}
