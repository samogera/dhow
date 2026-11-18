import type { Metadata } from "next";
import { BadgeCheck, Check, FileLock2, Smartphone, X } from "lucide-react";
import { CtaBand, CtaLink, PageHero, Section, SectionHead } from "@/components/site/parts";
import { Faq } from "@/components/site/faq";
import { kes } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dhow Verified",
  description: "The Dhow Verified badge shows your company is registered and real. Free manual review, or an instant check by M-Pesa.",
};

const fee = Number(process.env.VERIFICATION_FEE_KES ?? 500);

const faq = [
  { q: "What does the badge confirm?", a: "That your company's registration details match official records and that Dhow has reviewed your documents. It is not an endorsement of your products, services or finances." },
  { q: "Which documents do I need?", a: "For a free review: your certificate of incorporation or CR12, and your KRA PIN certificate. For the instant check: your business registration number on your company profile." },
  { q: "How long does it last?", a: "12 months. After that, you can renew from your account in a few clicks." },
  { q: "What if the instant check doesn't match?", a: "Nothing is lost. Your request moves to our review team automatically, and a person checks it. You won't be charged twice." },
  { q: "Who can see my documents?", a: "Only your own team and Dhow reviewers. Files are kept in private storage, your KRA PIN is encrypted, and access to sensitive records is logged." },
  { q: "Can I change my registration details after I'm verified?", a: "Registration details are locked once verified, so the badge always matches what was checked. Contact us if something needs correcting." },
];

export default function Verified() {
  return (
    <>
      <PageHero eyebrow="Dhow Verified" title={<>Proof your company is real<span className="text-mint">.</span></>}
        sub="Buyers, grant makers and partners want to know who they're dealing with. Get your registration checked once, and show it everywhere you apply.">
        <CtaLink href="/signup" variant="mint">Get verified</CtaLink>
        <CtaLink href="#how" variant="outline-light">How it works</CtaLink>
      </PageHero>

      {/* Two routes */}
      <Section id="how" className="scroll-mt-24">
        <SectionHead eyebrow="Two ways to get verified" title="Free and careful, or instant" center />
        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <article className="card flex flex-col p-8 sm:p-10">
            <div className="flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-2xl bg-navy-50 text-navy-900"><FileLock2 className="size-6" /></span>
              <span className="rounded-full bg-sunken px-3 py-1 text-sm font-medium">Free</span>
            </div>
            <h3 className="mt-8 text-2xl font-semibold tracking-tight">Manual review</h3>
            <p className="mt-2 text-muted">Upload your documents and our team checks them by hand.</p>
            <ol className="mt-8 space-y-4">
              {["Create your account and company profile", "Upload your certificate or CR12 and KRA PIN", "A Dhow reviewer checks them", "You're badged, and we email you"].map((t, i) => (
                <li key={t} className="flex gap-4"><span className="num grid size-7 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white">{i + 1}</span><span className="pt-0.5">{t}</span></li>
              ))}
            </ol>
          </article>
          <article className="flex flex-col rounded-[var(--radius-card)] bg-navy-900 p-8 text-white">
            <div className="flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-2xl bg-mint text-navy-950"><Smartphone className="size-6" /></span>
              <span className="rounded-full bg-mint px-3 py-1 text-sm font-semibold text-navy-950">{kes(fee)} · once</span>
            </div>
            <h3 className="mt-8 text-2xl font-semibold tracking-tight">Instant check</h3>
            <p className="mt-2 text-white/70">Pay by M-Pesa and we check your registration automatically.</p>
            <ol className="mt-8 space-y-4">
              {["Add your registration number to your profile", "Tap Pay and verify, and approve on your phone", "We check your registration against official records", "Badged straight away when it matches"].map((t, i) => (
                <li key={t} className="flex gap-4"><span className="num grid size-7 shrink-0 place-items-center rounded-full bg-mint text-xs font-semibold text-navy-950">{i + 1}</span><span className="pt-0.5 text-white/90">{t}</span></li>
              ))}
            </ol>
          </article>
        </div>
      </Section>

      {/* What it unlocks */}
      <Section tone="white" className="grid gap-14 lg:grid-cols-[1fr_1.1fr]">
        <SectionHead eyebrow="What you get" title="What the badge unlocks" sub="Verification is the key to the rest of Dhow." />
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            ["Verified-only opportunities", "Apply to RFPs, grants and programmes open only to checked companies."],
            ["More storage", "Your document vault grows from 50 MB to 500 MB on the free plan."],
            ["A badge on every application", "Organisers see straight away that you've been checked."],
            ["Faster introductions", "Partner firms and institutions can work with you sooner."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-3xl bg-canvas p-6">
              <BadgeCheck className="size-5 text-green" />
              <p className="mt-4 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Is / isn't */}
      <Section className="grid gap-4 md:grid-cols-2">
        <div className="card p-8">
          <p className="label">The badge means</p>
          <ul className="mt-5 space-y-3">
            {["Your company is registered", "Your details match official records", "Dhow has reviewed your documents", "It was checked in the last 12 months"].map((t) => (
              <li key={t} className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-green" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="card p-8">
          <p className="label">The badge doesn&apos;t mean</p>
          <ul className="mt-5 space-y-3 text-muted">
            {["We endorse your products or services", "We've audited your finances", "We guarantee any contract or payment", "You're licensed for regulated work"].map((t) => (
              <li key={t} className="flex gap-3"><X className="mt-0.5 size-5 shrink-0 text-faint" />{t}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="white" className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <SectionHead eyebrow="Questions" title="Verification, answered" />
        <Faq items={faq} />
      </Section>

      <CtaBand />
    </>
  );
}
