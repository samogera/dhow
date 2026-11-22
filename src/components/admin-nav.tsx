"use client";
import Link from "next/link";
import {
  Anchor, BarChart3, Building2, CalendarDays, FolderKanban, Handshake, LayoutDashboard, LifeBuoy, ShieldCheck, Sparkles, Target, UserCog, UsersRound, Wallet,
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

const groups = [
  { title: "Overview", tone: "navy", items: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  ] },
  { title: "Companies", tone: "green", items: [
    { href: "/admin/reviews", label: "Verification", icon: ShieldCheck },
    { href: "/admin/members", label: "Companies", icon: Building2 },
    { href: "/admin/opportunities", label: "Opportunities", icon: Sparkles },
  ] },
  { title: "Clients and work", tone: "amber", items: [
    { href: "/admin/leads", label: "Leads", icon: Target },
    { href: "/admin/clients", label: "Clients", icon: UsersRound },
    { href: "/admin/partners", label: "Partners", icon: Handshake },
    { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  ] },
  { title: "Money", tone: "mint", items: [{ href: "/admin/finance", label: "Finance", icon: Wallet }] },
  { title: "Dhow", tone: "slate", items: [
    { href: "/admin/company", label: "Dhow profile", icon: Anchor },
    { href: "/admin/team", label: "Team and access", icon: UserCog },
    { href: "/admin/help", label: "Help and guides", icon: LifeBuoy },
  ] },
] as const;

export function AdminNav({ role, counts = {} }: { role: "reviewer" | "finance" | "admin"; counts?: Record<string, number> }) {
  const path = usePathname();
  // Reviewers don't see money. The pages check roles on the server too; this just keeps the menu honest.
  const visible = groups.filter((g) => g.title !== "Money" || role !== "reviewer");
  return (
    <nav aria-label="Admin" className="space-y-5">
      {visible.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-faint uppercase">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon }) => {
              const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
              const tone = TONES[g.tone];
              return (
                <li key={href}>
                  <Link href={href} aria-current={on ? "page" : undefined}
                    className={cn("group flex items-center gap-3 rounded-2xl px-2 py-1.5 text-sm transition", on ? "bg-white font-semibold text-navy-900 shadow-sm" : "text-ink/80 hover:bg-white/70")}>
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl transition", on ? tone.on : tone.tile)}><Icon className="size-4" strokeWidth={2} /></span>
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
