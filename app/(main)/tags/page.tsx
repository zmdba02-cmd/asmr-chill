// /tags — kumpulan Tag (genre), Circle, dan Pengisi suara. Tab = ?kind=tag|circle|va.
import Link from "next/link";
import { BrowseView, type BrowseKind } from "@/components/BrowseView";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS: { kind: BrowseKind; label: string }[] = [
  { kind: "tag", label: "🏷 Genre / Tag" },
  { kind: "circle", label: "🏢 Circle" },
  { kind: "va", label: "🎤 Pengisi suara" },
];

export default async function TagsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.kind) ? sp.kind[0] : sp.kind;
  const kind: BrowseKind = raw === "va" || raw === "circle" ? raw : "tag";

  return (
    <>
      <nav className="tabs" aria-label="Jenis daftar">
        {TABS.map((t) => (
          <Link key={t.kind} href={t.kind === "tag" ? "/tags" : `/tags?kind=${t.kind}`} className={t.kind === kind ? "on" : ""}>
            {t.label}
          </Link>
        ))}
      </nav>
      {/* key: pindah tab = tampilan dibuat ulang (urutan & pencarian kembali ke awal) */}
      <BrowseView key={kind} kind={kind} />
    </>
  );
}
