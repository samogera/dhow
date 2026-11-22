"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** A thin animated bar at the top while the next page loads, so a slow connection never looks frozen. */
export function NavProgress() {
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  useEffect(() => setBusy(false), [path]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      setBusy(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => setBusy(false), 12000);
    return () => clearTimeout(t);
  }, [busy]);
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden transition-opacity duration-300 ${busy ? "opacity-100" : "opacity-0"}`}>
      <div className="nav-progress h-full w-1/3 rounded-full bg-gradient-to-r from-mint via-green to-mint" />
    </div>
  );
}
