export const SOCIALS = [
  { key: "linkedin", label: "LinkedIn", base: "https://www.linkedin.com/company/", placeholder: "linkedin.com/company/…" },
  { key: "x", label: "X (Twitter)", base: "https://x.com/", placeholder: "@handle" },
  { key: "facebook", label: "Facebook", base: "https://www.facebook.com/", placeholder: "facebook.com/…" },
  { key: "instagram", label: "Instagram", base: "https://www.instagram.com/", placeholder: "@handle" },
  { key: "youtube", label: "YouTube", base: "https://www.youtube.com/@", placeholder: "@channel" },
  { key: "tiktok", label: "TikTok", base: "https://www.tiktok.com/@", placeholder: "@handle" },
  { key: "whatsapp", label: "WhatsApp", base: "https://wa.me/", placeholder: "0712 345 678" },
] as const;

export type Socials = Partial<Record<(typeof SOCIALS)[number]["key"], string>>;
