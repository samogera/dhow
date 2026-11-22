import { LogoImg } from "@/components/logo-img";
import { ArrowUpRight, Building2, Globe2 } from "lucide-react";
import { Field, Input } from "@/components/ui";
import { SOCIALS, type Socials } from "@/lib/socials";
import { cn } from "@/lib/format";

/** Inputs for every social link, named social_<key>. */
export function SocialFields({ value, className }: { value?: Socials | null; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {SOCIALS.map((s) => (
        <Field key={s.key} label={s.label}><Input name={`social_${s.key}`} defaultValue={value?.[s.key] ?? ""} placeholder={s.placeholder} /></Field>
      ))}
    </div>
  );
}

/** Website and social links as tidy pills. */
export function SocialLinks({ website, socials }: { website?: string | null; socials?: Socials | null }) {
  const items = [
    ...(website ? [{ key: "web", label: website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), href: website }] : []),
    ...SOCIALS.filter((s) => socials?.[s.key]).map((s) => ({ key: s.key, label: s.label, href: socials![s.key]! })),
  ];
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <a key={i.key} href={i.href} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink/80 transition hover:border-navy-300 hover:text-navy-900">
          {i.key === "web" ? <Globe2 className="size-3.5 text-muted" /> : null}{i.label}<ArrowUpRight className="size-3 text-faint" />
        </a>
      ))}
    </div>
  );
}

/** A logo or photo, with initials as a fallback. */
export function Avatar({ src, name, size = "md", round }: { src?: string | null; name: string; size?: "sm" | "md" | "lg" | "xl"; round?: boolean }) {
  const dims = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-16 text-lg", xl: "size-24 text-2xl" }[size];
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div className={cn("grid shrink-0 place-items-center overflow-hidden border border-line bg-white font-semibold text-navy-700", round ? "rounded-full" : "rounded-2xl", dims)}>
      {src ? (round ? <img src={src} alt="" className="size-full object-cover" /> : <LogoImg src={src} className="p-1.5" />)
        : round ? <img src="/icons/person.png" alt="" className="size-full object-cover" />
        : initials || <Building2 className="size-1/2 text-faint" />}
    </div>
  );
}

/** File input for a logo/photo, with the current image and a remove option. */
export function ImageInput({ current, name, label = "Logo", round }: { current?: string | null; name: string; label?: string; round?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <Avatar src={current} name={name} size="lg" round={round} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-medium">{label}</p>
        <input type="file" name="image" accept="image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-navy-700" />
        <p className="text-xs text-faint">PNG, JPG or WebP, up to 3 MB.{round ? "" : " A see-through PNG works best; light logos get a dark background automatically."}</p>
        {current ? <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="remove_image" className="accent-navy-900" />Remove current {label.toLowerCase()}</label> : null}
      </div>
    </div>
  );
}
