import { clsx, type ClassValue } from "clsx";

export const cn = (...v: ClassValue[]) => clsx(v);

const kesFmt = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });
export const kes = (n: number | string | null | undefined) => `KSh ${kesFmt.format(Number(n ?? 0))}`;

export const bytes = (n: number) => {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
export const day = (d: string | Date | null | undefined) => (d ? dateFmt.format(new Date(d)) : "—");

const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
export const time = (d: string | Date) => timeFmt.format(new Date(d));

export const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);

export const label = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
