"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor, Bell, ClipboardList, FolderKanban, Handshake, Inbox, LifeBuoy, Lightbulb, Percent, UserCog, Wallet,
} from "lucide-react";
import { cn } from "@/lib/format";

// Each group has its own colour: a soft tile normally, a solid tile when the page is open.
const TONES = {
  navy: { tile: "bg-navy-50 text-navy-700", on: "bg-navy-900 text-white" },
  green: { tile: "bg-mint-100 text-green", on: "bg-green text-white" },
  amber: { tile: "bg-amber-100 text-amber-700", on: "bg-amber text-navy-950" },
  mint: { tile: "bg-mint-100 text-mint-600", on: "bg-mint text-navy-950" },
  slate: { tile: "bg-sunken text-ink/70", on: "bg-navy-700 text-white" },
} as const;

type Item = { href: string; label: string; icon?: typeof Anchor; img?: string; logo?: string };
const groups: { title: string; tone: keyof typeof TONES; items: Item[] }[] = [
  { title: "Overview", tone: "navy", items: [
    { href: "/admin", label: "Dashboard", img: "dashboard" },
    { href: "/admin/alerts", label: "Alerts", icon: Bell },
    { href: "/admin/analytics", label: "Analytics", img: "analytics" },
    { href: "/admin/calendar", label: "Calendar", img: "calendar" },
  ] },
  { title: "Companies", tone: "green", items: [
    { href: "/admin/reviews", label: "Verification", img: "verified" },
    { href: "/admin/members", label: "Companies", img: "companies" },
    { href: "/admin/opportunities", label: "Opportunities", img: "opportunities" },
    { href: "/admin/applications", label: "Membership applications", icon: ClipboardList },
    { href: "/admin/requests", label: "Member requests", icon: Inbox },
    { href: "/admin/discounts", label: "Plan discounts", icon: Percent },
    { href: "/admin/investors", label: "Investors", icon: Handshake },
  ] },
  { title: "Clients and work", tone: "amber", items: [
    { href: "/admin/leads", label: "Leads", img: "leads" },
    { href: "/admin/clients", label: "Clients", img: "clients" },
    { href: "/admin/partners", label: "Partners", img: "partners" },
    { href: "/admin/projects", label: "Projects", icon: FolderKanban },
    { href: "/admin/ideas", label: "Ideas", icon: Lightbulb },
  ] },
  { title: "Money", tone: "mint", items: [{ href: "/admin/finance", label: "Finance", icon: Wallet }] },
  { title: "Dhow", tone: "slate", items: [
    { href: "/admin/company", label: "Profile", logo: "/brand/icon-navy.png" },
    { href: "/admin/team", label: "Team and access", icon: UserCog },
    { href: "/admin/help", label: "Help and guides", icon: LifeBuoy },
  ] },
];

/** The icon in its coloured tile: a supplied line icon (tinted with the tile colour), a logo, or a built-in icon. */
function NavIcon({ item, cls }: { item: Item; cls: string }) {
  if (item.logo) return <span className={cn("grid size-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-line")}><img src={item.logo} alt="" className="size-5 object-contain" /></span>;
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl transition", cls)}>
      {item.img ? (
        <span aria-hidden className="size-[18px] bg-current" style={{ WebkitMaskImage: `url(/icons/${item.img}.png)`, maskImage: `url(/icons/${item.img}.png)`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
      ) : item.icon ? <item.icon className="size-4" strokeWidth={2} /> : null}
    </span>
  );
}

export function AdminNav({ role, counts = {} }: { role: "employee" | "reviewer" | "finance" | "admin"; counts?: Record<string, number> }) {
  const path = usePathname();
  // Reviewers don't see money. The pages check roles on the server too; this just keeps the menu honest.
  const visible = groups.filter((g) => g.title !== "Money" || role === "admin" || role === "finance");
  return (
    <nav aria-label="Admin" className="space-y-5">
      {visible.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-faint uppercase">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const { href, label } = item;
              const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
              const tone = TONES[g.tone];
              return (
                <li key={href}>
                  <Link href={href} aria-current={on ? "page" : undefined}
                    className={cn("group flex items-center gap-3 rounded-2xl px-2 py-1.5 text-sm transition", on ? "bg-white font-semibold text-navy-900 shadow-sm" : "text-ink/80 hover:bg-white/70")}>
                    <NavIcon item={item} cls={on ? tone.on : tone.tile} />
                    <span className="flex-1">{label}</span>
                    {counts[href] ? <span className={cn("num min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold", on ? "bg-navy-900 text-white" : "bg-amber text-navy-950")}>{counts[href]}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
