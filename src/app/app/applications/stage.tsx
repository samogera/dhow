"use client";
import { setApplicationStage } from "@/actions/member";

/** Change where an application stands; saves as soon as you pick. */
export function StageSelect({ id, status }: { id: string; status: string }) {
  return (
    <form action={setApplicationStage}>
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status} aria-label="Stage" onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-line bg-white py-1 pr-7 pl-2.5 text-[13px]">
        <option value="interested">Interested</option>
        <option value="started">Started</option>
        <option value="submitted">Submitted</option>
      </select>
    </form>
  );
}
