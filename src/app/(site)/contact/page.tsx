import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/site/parts";
import { ContactForm } from "./form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Tell us what you're planning in Kenya or East Africa. Our team will reply personally.",
};

const PLAN_TOPIC: Record<string, string> = { starter: "Pricing / plans", growth: "Pricing / plans", market_entry: "Market entry programme" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  return (
    <>
      <PageHero eyebrow="Contact" title={<>Tell us what you&apos;re planning<span className="text-mint">.</span></>}
        sub="Setting up a company, entering the market, or looking for the right partner firm? Send us a few lines and a real person from our team will reply." />

      <section className="relative z-10 mx-auto -mt-12 grid max-w-6xl gap-4 px-6 pb-24 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[2rem] bg-white p-7 shadow-sm sm:p-10">
          <ContactForm defaultTopic={plan ? PLAN_TOPIC[plan] : undefined} plan={plan} />
        </div>
        <aside className="space-y-4">
          <div className="rounded-[2rem] bg-navy-900 p-8 text-white">
            <p className="text-lg font-semibold">Prefer email?</p>
            <a href="mailto:hello@dhowpartners.com" className="mt-6 flex items-center gap-3 text-white/85 hover:text-white">
              <span className="grid size-10 place-items-center rounded-full bg-white/10"><Mail className="size-4 text-mint" /></span>hello@dhowpartners.com
            </a>
            <p className="mt-4 flex items-center gap-3 text-white/85">
              <span className="grid size-10 place-items-center rounded-full bg-white/10"><MapPin className="size-4 text-mint" /></span>Nairobi, Kenya
            </p>
          </div>
          <div className="card p-8">
            <MessageCircle className="size-6 text-green" />
            <p className="mt-5 font-semibold">What happens next</p>
            <ol className="mt-4 space-y-3 text-sm text-muted">
              <li><span className="font-medium text-ink">1.</span> Your message reaches our team straight away.</li>
              <li><span className="font-medium text-ink">2.</span> We reply by email to understand what you need.</li>
              <li><span className="font-medium text-ink">3.</span> You get a written plan within 48 hours of our first call.</li>
            </ol>
          </div>
        </aside>
      </section>
    </>
  );
}
