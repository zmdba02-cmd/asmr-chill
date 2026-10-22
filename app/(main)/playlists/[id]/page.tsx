import { PlaylistDetail } from "@/components/PlaylistDetail";

// Di Next.js 15+, `params` berupa Promise.
export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaylistDetail id={id} />;
}
