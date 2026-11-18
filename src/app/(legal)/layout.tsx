import { Logo } from "@/components/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Logo />
      <article className="card prose-dhow mt-8 p-8 sm:p-10">{children}</article>
      <p className="mt-6 text-center text-xs text-faint">Draft for review by Dhow Partners&apos; lawyer before launch.</p>
    </div>
  );
}
