import Link from "next/link";
import { BlurToggle } from "./BlurToggle";
import { LangToggle } from "./LangToggle";

export function Header() {
  return (
    <header className="top">
      <h1>
        <Link href="/">ASMR Pribadi</Link>
      </h1>
      <nav className="nav">
        <Link href="/">Jelajah</Link>
        <Link href="/watch-later">🕒 Tonton nanti</Link>
        <Link href="/favorites">★ Favorit</Link>
        <LangToggle />
        <BlurToggle />
      </nav>
    </header>
  );
}
