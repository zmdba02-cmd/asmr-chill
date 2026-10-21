import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Form biasa (tanpa JavaScript): dikirim ke /api/login, yang memasang cookie lalu kembali ke halaman asal.
export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  if (!process.env.APP_PASSWORD) redirect("/"); // login tidak aktif
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);

  return (
    <div className="login">
      <form method="post" action="/api/login">
        <h1>ASMR Pribadi</h1>
        <input type="password" name="password" placeholder="Password" autoComplete="current-password" autoFocus required />
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="on">
          Masuk
        </button>
        {sp.error !== undefined && <p className="status err">Password salah.</p>}
      </form>
    </div>
  );
}
