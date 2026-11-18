import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6">
      <div className="card max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <p className="num text-6xl font-semibold tracking-tight text-navy-900">404</p>
        <p className="mt-3 text-muted">We couldn&apos;t find that page. It may have moved, or the link may be wrong.</p>
        <div className="mt-8 flex justify-center gap-2">
          <ButtonLink href="/">Home</ButtonLink>
          <ButtonLink href="/app" variant="outline">Dashboard</ButtonLink>
        </div>
      </div>
    </main>
  );
}
