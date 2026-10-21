"use client";

// Di header: peringatan kalau konfigurasi hosting belum aman/permanen, plus tombol Keluar saat login aktif.

import { useEffect, useState } from "react";

type Status = { cloud: boolean; auth: boolean; persistent: boolean };

export function AccountBar() {
  const [s, setS] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Status>) : null))
      .then(setS)
      .catch(() => {});
  }, []);

  if (!s) return null;
  return (
    <>
      {s.cloud && !s.persistent && (
        <span className="warn" title="Data disimpan di disk sementara milik hosting dan akan hilang saat server restart. Isi UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN di Environment.">
          ⚠ Data tidak permanen
        </span>
      )}
      {s.cloud && !s.auth && (
        <span className="warn" title="Siapa pun yang tahu alamat situs ini bisa membuka dan mengubah datamu. Isi APP_PASSWORD di Environment.">
          ⚠ Tanpa password
        </span>
      )}
      {s.auth && (
        <form action="/api/logout" method="post" className="logout">
          <button type="submit" title="Keluar dari perangkat ini">
            Keluar
          </button>
        </form>
      )}
    </>
  );
}
