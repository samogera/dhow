"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings2, Briefcase, Building2, CalendarDays, Compass, FileCheck2, House, Landmark } from "lucide-react";
import { cn } from "@/lib/format";

const items = [
  { href: "/app", label: "Home", icon: House },
  { href: "/app/work", label: "Our work", icon: Briefcase, need: "work" },
  { href: "/app/opportunities", label: "Opportunities", icon: Compass },
  { href: "/app/events", label: "Events", icon: CalendarDays },
  { href: "/app/applications", label: "My applications", icon: FileCheck2 },
  { href: "/app/investors", label: "Investors", icon: Landmark, need: "investors" },
  { href: "/app/directory", label: "Directory", icon: Building2 },
];

export function MemberNav({ investors = false, work = false }: { investors?: boolean; work?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-full bg-white/60 p-1">
      {items.filter((i) => !("need" in i) || (i.need === "work" ? work : investors)).map((i) => {
        const on = i.href === "/app" ? path === "/app" : path.startsWith(i.href) || ("also" in i && (i.also as string[]).some((a) => path.startsWith(a)));
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} title={i.label} aria-label={i.label}
            className={cn("flex items-center gap-2 rounded-full px-3 py-2 text-sm whitespace-nowrap transition 2xl:px-3.5", on ? "bg-navy-900 font-medium text-white shadow-sm" : "text-ink/75 hover:bg-white")}>
            <i.icon className={cn("size-[17px]", on ? "text-white" : "text-ink/55")} strokeWidth={1.75} aria-hidden />
            <span>{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Round settings button beside the account menu. Lit on any settings page. */
export function SettingsLink() {
  const path = usePathname();
  const on = ["/app/settings", "/app/documents", "/app/verification", "/app/plans"].some((p) => path.startsWith(p));
  return (
    <Link href="/app/settings" aria-label="Settings" title="Settings" aria-current={on ? "page" : undefined}
      className={cn("hidden size-10 place-items-center rounded-full transition lg:grid", on ? "bg-navy-900 text-white" : "text-ink/60 hover:bg-white hover:text-ink")}>
      <Settings2 className="size-[18px]" strokeWidth={1.75} />
    </Link>
  );
}
