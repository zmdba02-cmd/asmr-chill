// =====================================================================
// serverSync.ts — menyalin data localStorage ke server lokal (/api/store/<key>).
//
// localStorage tetap dipakai sebagai cache cepat (halaman langsung tampil), tapi yang dianggap
// "asli" adalah file di server. Alurnya:
//   - saat halaman dibuka / tab kembali aktif: ambil dari server dan pakai itu;
//   - kalau di server belum ada apa-apa: unggah data lokal yang sudah ada (migrasi sekali jalan);
//   - saat data berubah: kirim ke server (digabung ~1,5 detik supaya tidak spam).
// Kalau server gagal dijangkau, aplikasi tetap jalan dari cache lokal.
// =====================================================================

const pending = new Map<string, unknown>();
const timers = new Map<string, number>();
let listening = false;

async function put(key: string, value: unknown, keepalive = false): Promise<void> {
  try {
    await fetch(`/api/store/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
      keepalive,
    });
  } catch {
    /* server belum nyala: coba lagi saat ada perubahan berikutnya */
  }
}

function flushAll(): void {
  timers.forEach((t) => window.clearTimeout(t));
  timers.clear();
  pending.forEach((value, key) => void put(key, value, true)); // keepalive: tetap terkirim saat tab ditutup
  pending.clear();
}

export function pushToServer(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  if (!listening) {
    listening = true;
    window.addEventListener("pagehide", flushAll);
  }
  pending.set(key, value);
  window.clearTimeout(timers.get(key));
  timers.set(
    key,
    window.setTimeout(() => {
      const value = pending.get(key);
      pending.delete(key);
      timers.delete(key);
      if (value !== undefined) void put(key, value);
    }, 1500),
  );
}

type Options<T> = {
  key: string;
  get: () => T; // isi cache saat ini
  replace: (next: T) => void; // ganti cache + render ulang (tanpa mengirim balik ke server)
  isEmpty: (value: T) => boolean;
};

const attached = new Set<string>();

export function attachServerSync<T>(o: Options<T>): void {
  if (typeof window === "undefined" || attached.has(o.key)) return;
  attached.add(o.key);

  const pull = async () => {
    if (pending.has(o.key)) return; // ada perubahan lokal yang belum terkirim
    try {
      const res = await fetch(`/api/store/${o.key}`, { cache: "no-store" });
      if (!res.ok) return;
      const remote = (await res.json()) as T | null;
      if (pending.has(o.key)) return; // berubah selagi menunggu jawaban
      if (remote === null) {
        const local = o.get();
        if (!o.isEmpty(local)) pushToServer(o.key, local);
        return;
      }
      if (JSON.stringify(remote) !== JSON.stringify(o.get())) o.replace(remote);
    } catch {
      /* abaikan: pakai cache lokal */
    }
  };

  void pull();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pull();
  });
}
