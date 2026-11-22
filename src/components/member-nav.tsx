"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Briefcase, CalendarDays, FileText, LayoutDashboard, Send, Settings } from "lucide-react";
import { cn } from "@/lib/format";

const items = [
  { href: "/app", label: "Home", icon: LayoutDashboard, tone: "text-navy-700" },
  { href: "/app/opportunities", label: "Opportunities", icon: Briefcase, tone: "text-amber-700" },
  { href: "/app/events", label: "Events", icon: CalendarDays, tone: "text-mint-600" },
  { href: "/app/applications", label: "Applications", icon: Send, tone: "text-navy-500" },
  { href: "/app/verification", label: "Verification", icon: BadgeCheck, tone: "text-green" },
  { href: "/app/documents", label: "Documents", icon: FileText, tone: "text-navy-600" },
  { href: "/app/settings", label: "Settings", icon: Settings, tone: "text-ink/60" },
];

export function MemberNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-full bg-white/60 p-1">
      {items.map((i) => {
        const on = i.href === "/app" ? path === "/app" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={cn("flex items-center gap-2 rounded-full px-3.5 py-2 text-sm whitespace-nowrap transition", on ? "bg-navy-900 font-medium text-white shadow-sm" : "text-ink/75 hover:bg-white")}>
            <i.icon className={cn("size-4", on ? "text-white" : i.tone)} />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
