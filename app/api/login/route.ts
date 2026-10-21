// POST /api/login — cek password dari form /login, lalu pasang cookie sesi.
import { SESSION_COOKIE, SESSION_MAX_AGE, safeEqual, safeNext, sessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Alamat relatif sengaja dipakai (lihat catatan di proxy.ts).
const redirect = (to: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 303, headers: { Location: to, ...headers } });

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return redirect("/");

  const form = await req.formData();
  const given = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"));

  if (!safeEqual(given, password)) {
    await new Promise((r) => setTimeout(r, 800)); // memperlambat tebak-tebakan password
    return redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const secure = req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";
  const cookie = [
    `${SESSION_COOKIE}=${sessionToken(password)}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  return redirect(next, { "Set-Cookie": cookie });
}
