import { Plus } from "lucide-react";

/** Accessible FAQ list using native <details>. No JavaScript needed. */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f) => (
        <details key={f.q} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken transition group-open:rotate-45 group-open:bg-navy-900 group-open:text-white"><Plus className="size-4" /></span>
          </summary>
          <p className="max-w-2xl pb-6 text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
