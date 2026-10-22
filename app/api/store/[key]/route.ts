// GET/PUT /api/store/<key> — penyimpanan data pribadi (favorit, "Tonton nanti", posisi terakhir, playlist).
//
// Dua mode, dipilih otomatis:
//   - Di laptop sendiri: file JSON di folder data/ (tanpa pengaturan apa pun).
//   - Di hosting: kalau UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN diisi, data
//     disimpan di database Upstash Redis (gratis), karena disk hosting gratis hilang saat server restart.
import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const KEYS = new Set(["favs", "watchlater", "positions", "playlists"]);
const DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(UP_URL && UP_TOKEN);

const fileOf = (key: string) => path.join(DIR, `${key}.json`);

// Kirim satu perintah Redis lewat REST, mis. ["GET", "asmr:favs"].
async function redis(command: unknown[]): Promise<unknown> {
  const res = await fetch(UP_URL as string, {
    method: "POST",
    headers: { Authorization: `Bearer ${UP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash menjawab ${res.status}`);
  return ((await res.json()) as { result?: unknown }).result ?? null;
}

// Mengembalikan null kalau datanya memang belum ada. Kalau penyimpanannya error, MELEMPAR error
// (bukan null), supaya klien tidak mengira data kosong lalu menimpa data yang sebenarnya ada.
async function readStore(key: string): Promise<unknown | null> {
  if (useUpstash) {
    const raw = await redis(["GET", `asmr:${key}`]);
    return typeof raw === "string" ? JSON.parse(raw) : null;
  }
  try {
    return JSON.parse(await fs.readFile(fileOf(key), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function writeStore(key: string, value: unknown): Promise<void> {
  if (useUpstash) {
    await redis(["SET", `asmr:${key}`, JSON.stringify(value)]);
    return;
  }
  await fs.mkdir(DIR, { recursive: true });
  const tmp = `${fileOf(key)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value), "utf8");
  await fs.rename(tmp, fileOf(key)); // tulis lalu ganti nama: file tidak setengah jadi kalau mati di tengah
}

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  if (!KEYS.has(key)) return Response.json({ error: "key tidak dikenal" }, { status: 404 });
  try {
    return Response.json(await readStore(key));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "gagal membaca" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  if (!KEYS.has(key)) return Response.json({ error: "key tidak dikenal" }, { status: 404 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON tidak valid" }, { status: 400 });
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "harus berupa objek" }, { status: 400 });
  }
  try {
    await writeStore(key, body);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "gagal menyimpan" }, { status: 500 });
  }
}
