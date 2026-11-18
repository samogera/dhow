import type { Metadata } from "next";
import Image from "next/image";
import { Compass, Eye, MessageSquareText, UserRound } from "lucide-react";
import { CtaBand, CtaLink, PageHero, Section, SectionHead } from "@/components/site/parts";

export const metadata: Metadata = {
  title: "About",
  description: "Dhow Partners helps founders, investors and foreign companies set up and grow in Kenya and East Africa.",
};

const values = [
  { icon: MessageSquareText, title: "Straight answers", body: "We tell you what it takes, what it costs and how long it will really be, before you commit." },
  { icon: UserRound, title: "One named contact", body: "You always know who is handling your work. No call centres, no passing you around." },
  { icon: Eye, title: "Checked, not assumed", body: "Partner firms are vetted before they get work, and companies are verified before they're trusted." },
  { icon: Compass, title: "Local know-how", body: "We work in Nairobi every day and know how registration, permits and partnerships actually get done." },
];

export default function About() {
  return (
    <>
      <PageHero eyebrow="About Dhow Partners" title={<>A trusted way in to Kenya and East Africa<span className="text-mint">.</span></>}
        sub="We help founders, investors and foreign companies do business in the region with confidence: properly registered, verified, and connected to the right people." />

      <Section className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="Our name" title="Why “Dhow”?" />
          <div className="mt-6 space-y-4 text-lg text-ink/80 text-pretty">
            <p>For centuries, dhows carried traders, goods and ideas along the East African coast and across the Indian Ocean. They were how people found their way in to new markets and new partners.</p>
            <p>That&apos;s what we do today. We give companies a clear, trusted way in: the right setup, the right checks and the right introductions, all through one partner.</p>
          </div>
        </div>
        <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[2.5rem] bg-navy-900">
          <Image src="/brand/icon-white.png" alt="" width={182} height={160} className="relative w-40 opacity-95 sm:w-48" />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-green" />
        </div>
      </Section>

      <Section tone="white">
        <SectionHead eyebrow="How we work" title="What you can expect from us" center />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="rounded-[2rem] bg-canvas p-7">
              <span className="grid size-12 place-items-center rounded-2xl bg-white text-navy-900"><v.icon className="size-6" /></span>
              <p className="mt-8 text-lg font-semibold tracking-tight">{v.title}</p>
              <p className="mt-2 text-sm text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <SectionHead eyebrow="What we do" title="Four services, done properly" />
        <div className="space-y-px overflow-hidden rounded-[2rem] bg-line">
          {[
            ["Company setup", "Registration, KRA PIN and permits through one named contact."],
            ["Dhow Verified", "A badge showing your registration has been checked."],
            ["Vetted partner firms", "Lawyers, accountants, banks and recruiters we have checked."],
            ["Opportunities", "Curated RFPs, tenders, grants and events for our members."],
          ].map(([t, d]) => (
            <div key={t} className="flex flex-col gap-1 bg-white p-6 sm:flex-row sm:items-center sm:gap-8">
              <p className="w-48 shrink-0 font-semibold">{t}</p>
              <p className="text-muted">{d}</p>
            </div>
          ))}
          <div className="bg-white p-6"><CtaLink href="/services" variant="ghost" className="-ml-6">Explore services</CtaLink></div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
