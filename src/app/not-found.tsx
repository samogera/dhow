import { ButtonLink } from "@/components/ui";
import { CenteredShell } from "@/components/centered-shell";

export default function NotFound() {
  return (
    <CenteredShell>
      <div className="text-center">
        <p className="num text-6xl font-semibold tracking-tight text-navy-900">404</p>
        <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted">It may have moved, or the link may be wrong.</p>
        <div className="mt-8 flex justify-center gap-2">
          <ButtonLink href="/">Go home</ButtonLink>
          <ButtonLink href="/help" variant="outline">Help Centre</ButtonLink>
        </div>
      </div>
    </CenteredShell>
  );
}
