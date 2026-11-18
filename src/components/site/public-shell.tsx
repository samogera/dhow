import Link from "next/link";
import { Logo } from "@/components/logo";
import { PUBLIC_LINKS } from "./nav";

/** Minimal white frame for public pages (help, privacy, terms). */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <span className="hidden h-5 w-px bg-line sm:block" />
          <Link href="/help" className="hidden text-sm font-medium text-ink/75 hover:text-ink sm:block">Help Centre</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-ink hover:bg-sunken">Sign in</Link>
          <Link href="/signup" className="rounded-full bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">Create account</Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-muted">
        <p>© {new Date().getFullYear()} Dhow Partners · Nairobi, Kenya</p>
        <nav className="flex gap-5">{PUBLIC_LINKS.map((l) => <Link key={l.href} href={l.href} className="hover:text-ink">{l.label}</Link>)}</nav>
      </div>
    </footer>
  );
}
