import Link from "next/link";

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Dhow Partners home">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="10" fill={light ? "#c6f24e" : "#0c2e21"} />
        <path d="M9 21h14l-2.5 3.5h-9L9 21Z" fill={light ? "#0c2e21" : "#c6f24e"} />
        <path d="M16 7v12.5M16 8.5l6 10H16" stroke={light ? "#0c2e21" : "#fff"} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      </svg>
      <span className={light ? "text-lg font-semibold text-white" : "text-lg font-semibold"}>Dhow</span>
    </Link>
  );
}
