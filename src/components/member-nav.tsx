"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Crown, LifeBuoy, LogOut, Menu, Settings2, Shield, X } from "lucide-react";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/format";

type Flags = { investors?: boolean; work?: boolean };

const OPP = ["/app/opportunities", "/app/events", "/app/investors"];
const SETTINGS = ["/app/settings", "/app/documents", "/app/verification", "/app/plans"];

function mainLinks({ work }: Flags) {
  return [
    { href: "/app", label: "Home", match: (p: string) => p === "/app" },
    { href: "/app/opportunities", label: "Opportunities", match: (p: string) => OPP.some((x) => p.startsWith(x)) },
    { href: "/app/applications", label: "My applications", match: (p: string) => p.startsWith("/app/applications") },
    { href: "/app/directory", label: "Directory", match: (p: string) => p.startsWith("/app/directory") },
    ...(work ? [{ href: "/app/work", label: "Our work", match: (p: string) => p.startsWith("/app/work") }] : []),
  ];
}

/** Desktop: a few plain words, the current one underlined in green. */
export function MemberNav(flags: Flags) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {mainLinks(flags).map((l) => {
        const on = l.match(path);
        return (
          <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}
            className={cn("relative rounded-full px-3.5 py-2 text-[15px] whitespace-nowrap transition", on ? "font-semibold text-navy-900" : "text-ink/65 hover:text-ink")}>
            {l.label}
            <span aria-hidden className={cn("absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-green transition-opacity", on ? "opacity-100" : "opacity-0")} />
          </Link>
        );
      })}
    </nav>
  );
}

/** Opportunities, Events and (for Growth and up) Investors: one section, three tabs. */
export function OpportunityTabs({ investors = false }: { investors?: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: "/app/opportunities", label: "Opportunities" },
    { href: "/app/events", label: "Events" },
    ...(investors ? [{ href: "/app/investors", label: "Investors" }] : []),
  ];
  return (
    <div role="tablist" className="mb-6 flex gap-6 border-b border-line">
      {tabs.map((t) => {
        const on = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} role="tab" aria-selected={on}
            className={cn("-mb-px border-b-2 pb-3 text-[15px] transition", on ? "border-navy-900 font-semibold text-navy-900" : "border-transparent text-ink/60 hover:text-ink")}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Closes a popover when you tap anywhere else, press Escape, or move to another page. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => close(), [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
}

/** Account menu: who you are, your company and plan, then settings, plan, help and sign out. */
export function AccountMenu({ name, email, company, plan, staff }: { name: string; email: string; company: string; plan: string; staff: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const initials = (name || email).split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const item = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/80 transition hover:bg-sunken hover:text-ink";
  return (
    <div ref={ref} className="relative hidden lg:block">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 transition hover:bg-white">
        <span className="grid size-9 place-items-center rounded-full bg-navy-900 text-sm font-semibold text-white">{initials}</span>
        <ChevronDown className={cn("size-4 text-ink/50 transition", open && "rotate-180")} />
      </button>
      <div role="menu" className={cn("absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-white p-2 shadow-[0_24px_60px_-20px_rgba(13,28,41,0.35)] ring-1 ring-line transition duration-150",
        open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0")}>
        <div className="flex items-center gap-3 px-3 pt-2 pb-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-semibold text-white">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name || "Your account"}</p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
        </div>
        <div className="mx-1 mb-2 flex items-center justify-between rounded-xl bg-sunken px-3 py-2 text-xs">
          <span className="truncate font-medium text-ink/80">{company}</span>
          <Link href="/app/plans" className="shrink-0 rounded-full bg-white px-2 py-0.5 font-semibold text-navy-700 ring-1 ring-line">{plan}</Link>
        </div>
        {staff ? <Link href="/admin" className={item}><Shield className="size-4" />Dhow workspace</Link> : null}
        <Link href="/app/settings" className={item}><Settings2 className="size-4" />Settings</Link>
        <Link href="/app/plans" className={item}><Crown className="size-4" />Plan and billing</Link>
        <Link href="/help" className={item}><LifeBuoy className="size-4" />Help Centre</Link>
        <div className="my-1 border-t border-line" />
        <form action={signOut}><button className={cn(item, "w-full")}><LogOut className="size-4" />Sign out</button></form>
      </div>
    </div>
  );
}

/** Phones: a menu button in the header that drops a simple list down from the top. */
export function MobileMenu({ investors, work, name, email, plan, staff }: Flags & { name: string; email: string; plan: string; staff: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const path = usePathname();
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const groups = [
    mainLinks({ work }).flatMap((l) => l.href === "/app/opportunities"
      ? [l, { href: "/app/events", label: "Events", match: (p: string) => p.startsWith("/app/events") }, ...(investors ? [{ href: "/app/investors", label: "Investors", match: (p: string) => p.startsWith("/app/investors") }] : [])]
      : [l]),
    [
      { href: "/app/settings", label: "Settings", match: (p: string) => SETTINGS.some((x) => p.startsWith(x)) && !p.startsWith("/app/plans") },
      { href: "/app/plans", label: `Plan · ${plan}`, match: (p: string) => p.startsWith("/app/plans") },
      { href: "/help", label: "Help Centre", match: () => false },
      ...(staff ? [{ href: "/admin", label: "Dhow workspace", match: () => false }] : []),
    ],
  ];
  return (
    <div ref={ref} className="lg:hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}
        className="grid size-10 place-items-center rounded-full bg-white text-navy-900 ring-1 ring-line">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      <div className={cn("fixed inset-x-0 top-0 -z-10 h-dvh bg-navy-950/25 backdrop-blur-[2px] transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden />
      <div className={cn("absolute inset-x-0 top-full mt-2 origin-top rounded-[1.5rem] bg-white p-3 shadow-[0_24px_60px_-20px_rgba(13,28,41,0.35)] ring-1 ring-line transition duration-200",
        open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0")}>
        <div className="flex items-center gap-3 px-2 pt-1 pb-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name || "Your account"}</p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
        </div>
        {groups.map((g, i) => (
          <ul key={i} className={cn("space-y-0.5", i && "mt-2 border-t border-line pt-2")}>
            {g.map((l) => {
              const on = l.match(path);
              return (
                <li key={l.href}>
                  <Link href={l.href} aria-current={on ? "page" : undefined}
                    className={cn("flex items-center justify-between rounded-xl px-3 py-3 text-[15px] transition", on ? "bg-navy-50 font-semibold text-navy-900" : "text-ink/80 active:bg-sunken")}>
                    {l.label}
                    {on ? <span className="size-1.5 rounded-full bg-green" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
        <form action={signOut} className="mt-2 border-t border-line pt-2">
          <button className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-[15px] text-ink/70 active:bg-sunken"><LogOut className="size-4" />Sign out</button>
        </form>
      </div>
    </div>
  );
}
