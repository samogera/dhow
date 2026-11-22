"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Building2, CalendarDays, Compass, FileCheck2, House, Landmark, Settings2 } from "lucide-react";
import { cn } from "@/lib/format";

const items = [
  { href: "/app", label: "Home", icon: House },
  { href: "/app/work", label: "Our work", icon: Briefcase, enterprise: true },
  { href: "/app/opportunities", label: "Opportunities", icon: Compass },
  { href: "/app/events", label: "Events", icon: CalendarDays },
  { href: "/app/applications", label: "My applications", icon: FileCheck2 },
  { href: "/app/investors", label: "Investors", icon: Landmark },
  { href: "/app/directory", label: "Directory", icon: Building2 },
  { href: "/app/settings", label: "Settings", icon: Settings2, also: ["/app/documents", "/app/verification", "/app/plans"] },
];

export function MemberNav({ enterprise = false }: { enterprise?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-full bg-white/60 p-1">
      {items.filter((i) => enterprise || !("enterprise" in i)).map((i) => {
        const on = i.href === "/app" ? path === "/app" : path.startsWith(i.href) || ("also" in i && (i.also as string[]).some((a) => path.startsWith(a)));
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} title={i.label} aria-label={i.label}
            className={cn("flex items-center gap-2 rounded-full px-3 py-2 text-sm whitespace-nowrap transition 2xl:px-3.5", on ? "bg-navy-900 font-medium text-white shadow-sm" : "text-ink/75 hover:bg-white")}>
            <i.icon className={cn("hidden size-[17px] 2xl:block", on ? "text-white" : "text-ink/55")} strokeWidth={1.75} aria-hidden />
            <span>{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
