"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/format";

/** A button that opens a side panel (a sheet on phones) holding a quick-add form. */
export function Drawer({ label, title, sub, children, variant = "primary", plus = true }: { label: string; title: string; sub?: string; children: ReactNode; variant?: "primary" | "outline"; plus?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={cn("inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition", !plus && "px-4 py-2 text-xs",
          variant === "primary" ? "bg-navy-900 text-white hover:bg-navy-700" : "border border-line bg-white hover:bg-sunken")}>
        {plus ? <Plus className="size-4" /> : null}{label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-navy-950/30 backdrop-blur-[2px]" />
          <div className="relative mt-auto flex max-h-[92dvh] w-full flex-col rounded-t-[2rem] bg-white shadow-2xl sm:mt-0 sm:h-full sm:max-h-none sm:max-w-xl sm:rounded-none sm:rounded-l-[2rem]">
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div><p className="text-lg font-semibold text-navy-900">{title}</p>{sub ? <p className="mt-0.5 text-sm text-muted">{sub}</p> : null}</div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-sunken"><X className="size-5" /></button>
            </div>
            <div className="overflow-y-auto px-6 py-6">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
