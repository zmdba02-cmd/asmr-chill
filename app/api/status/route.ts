// GET /api/status — kondisi penyimpanan & login, supaya layar bisa memberi peringatan kalau
// konfigurasi hosting belum benar (mis. data masih disimpan di disk sementara).
export const dynamic = "force-dynamic";

export function GET() {
  const cloud = Boolean(process.env.RENDER || process.env.VERCEL || process.env.FLY_APP_NAME || process.env.RAILWAY_ENVIRONMENT);
  return Response.json({
    cloud,
    auth: Boolean(process.env.APP_PASSWORD),
    persistent: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  });
}
