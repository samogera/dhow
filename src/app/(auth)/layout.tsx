import Link from "next/link";
import { BadgeCheck, FileLock2, Megaphone } from "lucide-react";
import { Logo } from "@/components/logo";
import { Arcs } from "@/components/site/arcs";

const points = [
  { icon: BadgeCheck, text: "Get your company Dhow Verified", tone: "bg-mint-100 text-green" },
  { icon: FileLock2, text: "Keep company documents in one secure place", tone: "bg-navy-50 text-navy-900" },
  { icon: Megaphone, text: "Apply to opportunities and track every application", tone: "bg-amber-100 text-amber-700" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative m-3 hidden overflow-hidden rounded-[2rem] bg-sunken p-12 lg:flex lg:flex-col">
        <Arcs className="pointer-events-none absolute -right-72 -bottom-72 w-[900px] text-navy-900/[0.06]" rings={7} />
        <Logo />
        <div className="relative mt-auto max-w-md">
          <p className="text-5xl leading-[1.05] font-semibold tracking-tight text-navy-900">
            Your way in<span className="text-amber">.</span>
          </p>
          <p className="mt-4 text-lg text-muted">Your Dhow Partners account: verification, documents and opportunities in one place.</p>
          <ul className="mt-10 space-y-4">
            {points.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-ink/80">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${p.tone}`}><p.icon className="size-4" /></span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-16 text-sm text-faint">© {new Date().getFullYear()} Dhow Partners · Nairobi, Kenya</p>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <div className="lg:hidden"><Logo size="sm" /></div>
          <Link href="/help" className="ml-auto text-sm text-muted hover:text-ink">Need help?</Link>
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-12">{children}</div>
        <p className="text-center text-xs text-faint">
          <Link href="/help" className="hover:text-ink">Help Centre</Link> · <Link href="/privacy" className="hover:text-ink">Privacy</Link> · <Link href="/terms" className="hover:text-ink">Terms</Link>
        </p>
      </main>
    </div>
  );
}
