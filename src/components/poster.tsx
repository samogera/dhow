"use client";
import { useState } from "react";
import { CalendarDays, Gift, Landmark, Megaphone, Rocket } from "lucide-react";
import { cn } from "@/lib/format";

const KIND_STYLE: Record<string, { icon: typeof Rocket; tone: string }> = {
  grant: { icon: Gift, tone: "from-amber-100 to-white text-amber-700" },
  program: { icon: Rocket, tone: "from-mint-100 to-white text-green" },
  event: { icon: CalendarDays, tone: "from-navy-50 to-white text-navy-700" },
  tender: { icon: Landmark, tone: "from-navy-100 to-white text-navy-900" },
  rfp: { icon: Megaphone, tone: "from-navy-50 to-white text-navy-900" },
};

/** The opportunity's poster (its own share image), with a branded placeholder if there is none or it fails to load. */
export function Poster({ src, kind, className }: { src: string | null; kind: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const style = KIND_STYLE[kind] ?? KIND_STYLE.program;
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br", style.tone, className)}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center"><style.icon className="size-10 opacity-70" strokeWidth={1.5} /></div>
      )}
    </div>
  );
}
