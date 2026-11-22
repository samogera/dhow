"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LifeBuoy, LogOut, Settings2, Shield, UserRound } from "lucide-react";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/format";

export function Avatar({ name, email, src, size = 36 }: { name: string; email: string; src?: string | null; size?: number }) {
  const initials = (name || email).split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return src
    ? <img src={src} alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover ring-1 ring-line" />
    : <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-semibold text-white">{initials}</span>;
}

/** Staff account menu. Closes when you tap elsewhere, press Escape or open another page. */
export function UserMenu({ name, email, avatar, staff, helpHref = "/help", settingsHref, profileHref = "/admin/profile" }: {
  name: string; email: string; avatar?: string | null; staff: boolean; helpHref?: string; settingsHref?: string; profileHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  const item = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/80 transition hover:bg-sunken hover:text-ink";
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-white/80 bg-white/70 py-1 pr-2.5 pl-1 backdrop-blur-xl transition hover:bg-white">
        <Avatar name={name} email={email} src={avatar} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-36 truncate text-sm font-medium">{name || "Your account"}</span>
          <span className="block max-w-36 truncate text-xs text-muted">{email}</span>
        </span>
        <ChevronDown className={cn("size-4 text-ink/50 transition", open && "rotate-180")} />
      </button>
      <div role="menu" className={cn("absolute right-0 z-40 mt-2 w-64 origin-top-right rounded-2xl bg-white p-2 shadow-[0_24px_60px_-20px_rgba(13,28,41,0.35)] ring-1 ring-line transition duration-150",
        open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0")}>
        <div className="flex items-center gap-3 px-3 pt-2 pb-3">
          <Avatar name={name} email={email} src={avatar} size={40} />
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{name || "Your account"}</p><p className="truncate text-xs text-muted">{email}</p></div>
        </div>
        {staff ? <Link href="/admin" className={item}><Shield className="size-4" />Dhow workspace</Link> : null}
        <Link href={profileHref} className={item}><UserRound className="size-4" />Your profile</Link>
        {settingsHref ? <Link href={settingsHref} className={item}><Settings2 className="size-4" />Settings</Link> : null}
        <Link href={helpHref} className={item}><LifeBuoy className="size-4" />Help and guides</Link>
        <div className="my-1 border-t border-line" />
        <form action={signOut}><button className={cn(item, "w-full")}><LogOut className="size-4" />Sign out</button></form>
      </div>
    </div>
  );
}
