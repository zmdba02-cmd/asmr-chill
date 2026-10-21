"use client";

// SearchBar — form pencarian + filter tag. Cara kerjanya: ubah URL (mis.
// /?inc=a&inc=b&exc=c&mode=or), lalu Next.js otomatis memuat ulang data sesuai URL baru.
// Jadi seluruh filter hidup di URL: bisa di-bookmark, dan tombol Back berfungsi.

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { MAX_TAGS_PER_LIST, ORDER_OPTIONS } from "@/lib/constants";
import { filtersToParams, type Filters, type MatchMode } from "@/lib/filters";
import { ensureServerTags } from "@/lib/tagDict";
import { TagPicker } from "./TagPicker";

type Props = { defaults: Omit<Filters, "page"> };

export function SearchBar({ defaults }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(defaults.q);
  const [order, setOrder] = useState(defaults.order);
  const [sub, setSub] = useState(defaults.sub);
  const [inc, setInc] = useState(defaults.inc);
  const [exc, setExc] = useState(defaults.exc);
  const [mode, setMode] = useState<MatchMode>(defaults.mode);

  useEffect(() => {
    void ensureServerTags(); // isi kamus tag untuk saran (aman kalau gagal)
  }, []);

  // Pindah ke URL baru. `next` menimpa nilai yang baru saja berubah (state React baru
  // berlaku di render berikutnya, jadi nilai terbaru kita kirim lewat sini).
  function go(next: Partial<Omit<Filters, "page">> = {}) {
    const qs = filtersToParams({ q, order, sub, inc, exc, mode, ...next }).toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    go();
  }

  // Menambah ke satu daftar otomatis mencabutnya dari daftar lawannya.
  function addInc(name: string) {
    if (inc.includes(name) || inc.length >= MAX_TAGS_PER_LIST) return;
    const nextInc = [...inc, name];
    const nextExc = exc.filter((t) => t !== name);
    setInc(nextInc);
    setExc(nextExc);
    go({ inc: nextInc, exc: nextExc });
  }
  function addExc(name: string) {
    if (exc.includes(name) || exc.length >= MAX_TAGS_PER_LIST) return;
    const nextExc = [...exc, name];
    const nextInc = inc.filter((t) => t !== name);
    setExc(nextExc);
    setInc(nextInc);
    go({ inc: nextInc, exc: nextExc });
  }
  function removeInc(name: string) {
    const nextInc = inc.filter((t) => t !== name);
    setInc(nextInc);
    go({ inc: nextInc });
  }
  function removeExc(name: string) {
    const nextExc = exc.filter((t) => t !== name);
    setExc(nextExc);
    go({ exc: nextExc });
  }
  function changeMode(next: MatchMode) {
    setMode(next);
    go({ mode: next });
  }
  function clearTags() {
    setInc([]);
    setExc([]);
    go({ inc: [], exc: [] });
  }

  return (
    <form className="searchbar" onSubmit={onSubmit}>
      <div className="controls">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari judul / kode RJ / pengisi suara…"
          autoComplete="off"
        />
        <select
          value={order}
          title="Urutkan"
          onChange={(e) => {
            setOrder(e.target.value);
            go({ order: e.target.value });
          }}
        >
          {ORDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={sub}
            onChange={(e) => {
              setSub(e.target.checked);
              go({ sub: e.target.checked });
            }}
          />
          Ada subtitle
        </label>
        <button type="submit">Cari</button>
      </div>

      <div className="tagfilters">
        <div>
          <TagPicker title="Sertakan tag" variant="inc" tags={inc} onAdd={addInc} onRemove={removeInc} />
          <div className="modes" role="radiogroup" aria-label="Cara mencocokkan tag yang disertakan">
            <label>
              <input type="radio" name="match-mode" checked={mode === "and"} onChange={() => changeMode("and")} />
              Semua tag (AND)
            </label>
            <label>
              <input type="radio" name="match-mode" checked={mode === "or"} onChange={() => changeMode("or")} />
              Salah satu (OR)
            </label>
          </div>
        </div>
        <TagPicker title="Kecualikan tag" variant="exc" tags={exc} onAdd={addExc} onRemove={removeExc} />
      </div>

      {(inc.length > 0 || exc.length > 0) && (
        <button type="button" className="linklike" onClick={clearTags}>
          Hapus semua filter tag
        </button>
      )}
    </form>
  );
}
