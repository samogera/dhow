/** Blue "verified" badge, like on social profiles, with the word next to it. */
export function VerifiedTick({ label = true, size = 16 }: { label?: boolean; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 align-middle text-xs font-semibold text-[#1d9bf0]" title="Verified">
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path fill="#1d9bf0" d="M22.5 12.5c0-1.58-.88-2.95-2.17-3.66.15-.44.23-.91.23-1.4 0-2.21-1.71-4-3.82-4-.47 0-.92.09-1.33.25C14.8 2.42 13.47 1.5 12 1.5s-2.8.92-3.4 2.19c-.42-.16-.87-.25-1.34-.25-2.11 0-3.82 1.79-3.82 4 0 .49.08.96.22 1.4-1.29.71-2.16 2.08-2.16 3.66 0 1.5.78 2.8 1.93 3.54-.02.17-.03.34-.03.51 0 2.21 1.71 4 3.82 4 .47 0 .92-.09 1.33-.25.6 1.27 1.93 2.19 3.45 2.19s2.85-.92 3.45-2.19c.41.16.86.25 1.33.25 2.11 0 3.82-1.79 3.82-4 0-.17-.01-.34-.03-.51 1.15-.74 1.93-2.04 1.93-3.54z" />
        <path fill="#fff" d="M10.54 16.4 7 12.86l1.41-1.41 2.12 2.12 5.06-5.06L17 9.92z" />
      </svg>
      {label ? "Verified" : null}
    </span>
  );
}
