"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setApplicationStage, withdrawApplication } from "@/actions/member";
import { cn } from "@/lib/format";

/** Change where an application stands. Saves the moment you pick, shows a tick, then the list updates. */
export function StageSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function change(value: string) {
    setBusy(true);
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", value);
    await setApplicationStage(fd).catch(() => null);
    setBusy(false);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
    router.refresh();
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <select name="status" defaultValue={status} aria-label="Stage" disabled={busy} onChange={(e) => change(e.target.value)}
        className={cn("rounded-lg border border-line bg-white py-1 pr-7 pl-2.5 text-[13px]", busy && "opacity-60")}>
        <option value="interested">Interested</option>
        <option value="started">Started</option>
        <option value="submitted">Submitted</option>
      </select>
      {busy ? <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-navy-600 border-t-transparent" /> : done ? <Check aria-label="Saved" className="size-4 text-green" /> : null}
    </span>
  );
}

/** Take an opportunity off My applications, after a quick confirm. */
export function RemoveApplication({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} className="rounded-full px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:bg-sunken hover:text-ink disabled:opacity-50"
      onClick={async () => {
        if (!confirm("Remove this from My applications?")) return;
        setBusy(true);
        const fd = new FormData();
        fd.set("id", id);
        await withdrawApplication(fd).catch(() => null);
        router.refresh();
      }}>
      {busy ? "Removing…" : "Remove"}
    </button>
  );
}
