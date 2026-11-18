import Link from "next/link";
import { BadgeCheck, FileLock2, Handshake } from "lucide-react";
import { Logo } from "@/components/logo";
import { Arcs } from "@/components/site/arcs";

const points = [
  { icon: BadgeCheck, text: "Get your company Dhow Verified" },
  { icon: FileLock2, text: "Keep registration documents in one secure place" },
  { icon: Handshake, text: "Apply to RFPs, grants and partner programmes" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col">
        <Arcs className="absolute -left-40 top-1/2 h-[140%] -translate-y-1/2 text-white/[0.07]" />
        <Logo light />
        <div className="relative mt-auto max-w-md">
          <p className="text-5xl leading-[1.05] font-semibold tracking-tight">
            Your way in<span className="text-mint">.</span>
          </p>
          <p className="mt-4 text-lg text-white/75">Set up and grow in Kenya and East Africa.</p>
          <ul className="mt-10 space-y-4">
            {points.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-white/85">
                <span className="grid size-9 place-items-center rounded-full bg-white/10"><p.icon className="size-4 text-mint" /></span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-16 text-sm text-white/50">© {new Date().getFullYear()} Dhow Partners · Nairobi, Kenya</p>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <div className="lg:hidden"><Logo /></div>
          <Link href="/" className="ml-auto text-sm text-muted hover:text-ink">← Back to dhowpartners.com</Link>
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-12">{children}</div>
        <p className="text-center text-xs text-faint">
          Protected by Supabase Auth · <Link href="/privacy" className="hover:text-ink">Privacy</Link> · <Link href="/terms" className="hover:text-ink">Terms</Link>
        </p>
      </main>
    </div>
  );
}
