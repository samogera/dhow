"use client";
import { useState } from "react";
import { cn } from "@/lib/format";

/**
 * A logo that stays readable on any tile. When the image has a see-through background and is mostly
 * light (white text, pale marks), it gets a navy backdrop instead of white so nothing disappears.
 */
export function LogoImg({ src, className }: { src: string; className?: string }) {
  const [dark, setDark] = useState(false);
  function check(img: HTMLImageElement) {
    try {
      const n = 48;
      const c = document.createElement("canvas");
      c.width = n; c.height = n;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (!g) return;
      g.drawImage(img, 0, 0, n, n);
      const d = g.getImageData(0, 0, n, n).data;
      let clear = 0, solid = 0, light = 0;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3];
        if (a < 40) { clear++; continue; }
        solid++;
        const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        if (lum > 0.82) light++;
      }
      // See-through image whose visible part is largely white or pale.
      setDark(clear > n * n * 0.08 && solid > 0 && light / solid > 0.35);
    } catch {
      // Image served without CORS: keep the white tile.
    }
  }
  return (
    <span className={cn("grid size-full place-items-center transition-colors", dark ? "bg-navy-900" : "bg-white")}>
      <img src={src} alt="" crossOrigin="anonymous" onLoad={(e) => check(e.currentTarget)} className={cn("size-full object-contain", className)} />
    </span>
  );
}
