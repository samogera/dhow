"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/** Workspace search. Ctrl/⌘ K focuses it from anywhere. */
export function SearchBox({ placeholder = "Search companies, leads, partners, opportunities…" }: { placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form role="search" className="relative w-full max-w-xl" onSubmit={(e) => {
      e.preventDefault();
      const q = ref.current?.value.trim();
      if (q) router.push(`/admin/search?q=${encodeURIComponent(q)}`);
    }}>
      <Search className="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-muted" />
      <input ref={ref} name="q" type="search" placeholder={placeholder} aria-label="Search the workspace"
        className="w-full rounded-full border border-white/80 bg-white/70 py-2.5 pr-16 pl-11 text-base shadow-sm backdrop-blur-xl outline-none transition placeholder:text-faint focus:border-navy-300 focus:bg-white sm:text-sm" />
      <kbd className="pointer-events-none absolute z-10 top-1/2 right-3 hidden -translate-y-1/2 rounded-lg border border-line bg-white px-2 py-0.5 text-[11px] text-faint sm:block">Ctrl K</kbd>
    </form>
  );
}
