export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <article className="prose-dhow">{children}</article>
    </div>
  );
}
