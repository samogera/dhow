"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/format";
import { NAV } from "./nav";


/** Site header. `dark` sits on the navy hero; otherwise it is a white bar. */
export function SiteHeader({ dark = false }: { dark?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const light = dark && !scrolled && !open;

  return (
    <header className={cn("sticky top-0 z-40 transition-colors duration-300", light ? "bg-transparent" : "border-b border-line/70 bg-white/90 backdrop-blur-md")}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6 sm:h-[72px]">
        <Logo light={light} />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const on = path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
                className={cn("rounded-full px-3.5 py-2 text-sm transition",
                  light ? (on ? "bg-white/15 text-white" : "text-white/75 hover:text-white") : (on ? "bg-navy-50 text-navy-900" : "text-ink/70 hover:text-ink"))}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className={cn("rounded-full px-4 py-2 text-sm font-medium", light ? "text-white hover:bg-white/10" : "text-ink hover:bg-sunken")}>Sign in</Link>
          <Link href="/signup" className={cn("rounded-full px-5 py-2.5 text-sm font-medium transition", light ? "bg-mint text-navy-950 hover:bg-white" : "bg-navy-900 text-white hover:bg-navy-700")}>Get started</Link>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}
          className={cn("grid size-10 place-items-center rounded-full lg:hidden", light ? "text-white hover:bg-white/10" : "hover:bg-sunken")}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-line bg-white px-6 pb-6 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col py-3">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="border-b border-line py-3.5 text-lg">{n.label}</Link>)}
          </nav>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/login" className="rounded-full border border-line py-3 text-center text-sm font-medium">Sign in</Link>
            <Link href="/signup" className="rounded-full bg-navy-900 py-3 text-center text-sm font-medium text-white">Get started</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
