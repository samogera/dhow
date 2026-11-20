import Link from "next/link";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/format";

/** Centred page frame for sign-in, sign-up, password, invite, onboarding and error pages. */
export function CenteredShell({ children, wide = false, logoHref = "/" }: { children: React.ReactNode; wide?: boolean; logoHref?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-4">
      <main className="flex flex-1 flex-col items-center justify-center py-12">
        <Logo href={logoHref} />
        <div className={cn("mt-8 w-full rounded-[2rem] border border-line bg-white p-8 shadow-[0_1px_2px_rgba(13,28,41,0.04),0_12px_32px_-12px_rgba(13,28,41,0.12)] sm:p-10", wide ? "max-w-xl" : "max-w-md")}>
          {children}
        </div>
      </main>
      <footer className="pb-8 text-center text-xs text-faint">
        <Link href="/help" className="hover:text-ink">Help Centre</Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <p className="mt-2">© {new Date().getFullYear()} Dhow Partners · Nairobi, Kenya</p>
      </footer>
    </div>
  );
}
