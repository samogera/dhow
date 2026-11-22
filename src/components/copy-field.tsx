"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** A read-only link with a copy button, plus a WhatsApp share. */
export function CopyField({ value, share }: { value: string; share?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input readOnly value={value} aria-label="Link" onFocus={(e) => e.currentTarget.select()} className="field min-w-0 flex-1 py-2 text-xs" />
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(value).catch(() => null); setDone(true); setTimeout(() => setDone(false), 1500); }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-navy-900 px-4 py-2 text-xs font-medium text-white">
          {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{done ? "Copied" : "Copy"}
        </button>
      </div>
      {share ? <a href={`https://wa.me/?text=${encodeURIComponent(`${share} ${value}`)}`} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-medium text-green">Share on WhatsApp ↗</a> : null}
    </div>
  );
}
