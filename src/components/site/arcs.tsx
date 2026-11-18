/** Concentric arcs from the Dhow Partners banner. Colour comes from `currentColor`. */
export function Arcs({ className, rings = 6 }: { className?: string; rings?: number }) {
  return (
    <svg viewBox="0 0 800 800" className={className} fill="none" aria-hidden>
      {Array.from({ length: rings }, (_, i) => (
        <circle key={i} cx="400" cy="400" r={110 + i * 58} stroke="currentColor" strokeWidth="1.5" />
      ))}
    </svg>
  );
}
