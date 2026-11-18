import { Arcs } from "@/components/site/arcs";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <section className="relative -mt-16 overflow-hidden bg-navy-900 pt-16 text-white sm:-mt-[72px] sm:pt-[72px]">
        <Arcs className="pointer-events-none absolute -right-56 -top-60 w-[800px] text-white/[0.06]" />
        <div className="relative mx-auto max-w-3xl px-6 py-14 sm:py-16"><p className="text-sm text-mint">Legal</p></div>
      </section>
      <div className="mx-auto -mt-8 max-w-3xl px-6 pb-20">
        <article className="card prose-dhow relative p-8 shadow-sm sm:p-12">{children}</article>
        <p className="mt-6 text-center text-xs text-faint">Draft for review by Dhow Partners&apos; lawyer before launch.</p>
      </div>
    </>
  );
}
