import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] bg-sunken px-6 py-8 sm:px-12">
        <Logo />
        {/* Quiet geometric shapes echo the reference: blocks on a baseline */}
        <svg aria-hidden viewBox="0 0 220 140" className="pointer-events-none absolute bottom-10 left-8 hidden w-52 md:block">
          <line x1="0" y1="139" x2="220" y2="139" stroke="#121a16" />
          <rect x="20" y="80" width="56" height="59" fill="#fff" stroke="#121a16" />
          <rect x="76" y="60" width="56" height="79" fill="#c6f24e" stroke="#121a16" />
          <path d="M40 125 Q 45 95 64 92" fill="none" stroke="#121a16" />
        </svg>
        <svg aria-hidden viewBox="0 0 220 160" className="pointer-events-none absolute right-8 bottom-10 hidden w-52 md:block">
          <line x1="0" y1="159" x2="220" y2="159" stroke="#121a16" />
          <rect x="40" y="90" width="64" height="69" fill="#fff" stroke="#121a16" />
          <rect x="104" y="50" width="64" height="109" fill="#c6f24e" stroke="#121a16" />
          <circle cx="170" cy="40" r="16" fill="none" stroke="#121a16" />
        </svg>
        <div className="relative mx-auto my-10 w-full max-w-sm rounded-3xl bg-white p-7 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
