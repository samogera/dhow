import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";

/**
 * The Dhow Partners logo. "full" is the wordmark; "icon" is the D-arrow mark.
 * Files live in /public/brand (cropped from the official brand pack).
 */
export function Logo({ href = "/", light = false, variant = "full", size = "md", className }: { href?: string; light?: boolean; variant?: "full" | "icon"; size?: "sm" | "md" | "lg"; className?: string }) {
  const tone = light ? "white" : "navy";
  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center", className)} aria-label="Dhow Partners home">
      {variant === "icon" ? (
        <Image src={`/brand/icon-${tone}.png`} alt="Dhow Partners" width={182} height={160} className="h-8 w-auto" priority />
      ) : (
        <Image src={`/brand/wordmark-${tone}.png`} alt="Dhow Partners" width={916} height={96} className={size === "sm" ? "h-[18px] w-auto" : size === "lg" ? "h-7 w-auto sm:h-8" : "h-[22px] w-auto sm:h-6"} priority />
      )}
    </Link>
  );
}
