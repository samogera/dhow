export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <article className="prose-dhow">{children}</article>
      <p className="mt-12 border-t border-line pt-6 text-xs text-faint">Draft for review by Dhow Partners&apos; lawyer before launch.</p>
    </div>
  );
}
