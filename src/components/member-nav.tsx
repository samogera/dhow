"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const items = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/documents", label: "Documents" },
  { href: "/app/verification", label: "Verification" },
  { href: "/app/opportunities", label: "Opportunities" },
  { href: "/app/applications", label: "Applications" },
  { href: "/app/settings", label: "Settings" },
];

export function MemberNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-full bg-sunken p-1">
      {items.map((i) => {
        const on = i.href === "/app" ? path === "/app" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={cn("rounded-full px-4 py-2 text-sm whitespace-nowrap transition", on ? "bg-white font-medium text-ink shadow-sm" : "text-muted hover:text-ink")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
