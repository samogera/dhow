// Pure helpers that turn an opportunity post (HTML) into short facts.
// We keep facts only (deadline, up to 4 short eligibility and benefit points, sectors)
// and always link back to the original post. Full articles are never copied.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };

export function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export function stripTags(html: string) {
  return decodeEntities(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);
const clean = (s: string) => stripTags(s).replace(/\s+/g, " ").replace(/^[\s•\-–—:;,.]+/, "").trim();

const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";

/** Finds "Application Deadline: 18 December 2026" style dates. Returns YYYY-MM-DD or null (rolling/unspecified). */
export function extractDeadline(text: string): string | null {
  const m = new RegExp(`deadline[^:\\n]{0,20}:?\\s*([^\\n]{0,80})`, "i").exec(text);
  if (!m) return null;
  const s = m[1].replace(/(\d+)(st|nd|rd|th)\b/gi, "$1").replace(/,/g, " ").replace(/\./g, " ");
  const dm = new RegExp(`(\\d{1,2})\\s+(${MONTHS})\\s+(\\d{4})`, "i").exec(s) ?? null;
  const md = new RegExp(`(${MONTHS})\\s+(\\d{1,2})\\s+(\\d{4})`, "i").exec(s) ?? null;
  let day: number, mon: string, year: number;
  if (dm) [day, mon, year] = [Number(dm[1]), dm[2], Number(dm[3])];
  else if (md) [mon, day, year] = [md[1], Number(md[2]), Number(md[3])];
  else return null;
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(mon.slice(0, 3).toLowerCase());
  const d = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

/** Bullet points under the first heading matching `heading` (h2–h5, or a bold paragraph). Up to `max` items. */
export function sectionPoints(html: string, heading: RegExp, max = 4): string[] {
  const headRe = /<(h[2-5])[^>]*>([\s\S]*?)<\/\1>|<p[^>]*>\s*<(strong|b)[^>]*>([\s\S]*?)<\/\3>\s*:?\s*<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = headRe.exec(html))) {
    const title = clean(m[2] ?? m[4] ?? "");
    if (!heading.test(title) || title.length > 80) continue;
    const rest = html.slice(headRe.lastIndex);
    const next = rest.search(/<h[2-5][^>]*>|<p[^>]*>\s*<(strong|b)[^>]*>[^<]{2,60}<\/(strong|b)>\s*:?\s*<\/p>/i);
    const block = next >= 0 ? rest.slice(0, next) : rest.slice(0, 4000);
    const items = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((x) => clean(x[1])).filter((x) => x.length > 3);
    const points = items.length ? items : [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((x) => clean(x[1])).filter((x) => x.length > 10);
    return points.slice(0, max).map((p) => clip(p, 170));
  }
  return [];
}

export const ELIGIBILITY = /eligib|requirement|who (can|should) apply|criteria|qualif/i;
export const BENEFITS = /benefit|what you (get|will get|gain)|prize|award|reward|perk|funding|what('s| is) (offered|covered)|incentive/i;

/** The post's own share image (og:image), used the way link previews use it. */
export function ogImage(html: string): string | null {
  const m = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html) ?? /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
  const url = m ? decodeEntities(m[1]) : null;
  return url && /^https:\/\//i.test(url) ? url : null;
}

export type OppKind = "rfp" | "tender" | "grant" | "event" | "program";
export function kindFrom(title: string, categories: string[]): OppKind {
  const t = `${title} ${categories.join(" ")}`.toLowerCase();
  if (/\btender|procurement|expression of interest|\beoi\b/.test(t)) return "tender";
  if (/\brfp\b|request for proposals?|call for proposals|consultan/.test(t)) return "rfp";
  if (/conference|summit|forum|webinar|expo|festival|\bevent/.test(t)) return "event";
  if (/grant|fund(ing)?\b|prize|award|competition|challenge|pitch/.test(t)) return "grant";
  return "program";
}

const SECTOR_WORDS: [string, RegExp][] = [
  ["Agriculture", /agri|farm|food system|agro/i],
  ["Climate & energy", /climate|energy|solar|renewable|green|sustainab|environment/i],
  ["Health", /health|medic|hiv|malaria|clinic|pharma/i],
  ["Education", /educat|school|scholarship|universit|learning/i],
  ["Technology", /tech|digital|\bai\b|software|data|cyber|startup/i],
  ["Finance", /fintech|financ|bank|invest|capital/i],
  ["Creative", /\b(film|music|arts?|creative|media|journalis\w*|photograph\w*|writ\w*)\b/i],
  ["Women & youth", /women|female|girls|youth|young/i],
  ["Social impact", /social (enterprise|impact|business)|nonprofit|ngo|civil society/i],
];
export function sectorsFrom(text: string): string[] {
  return SECTOR_WORDS.filter(([, re]) => re.test(text)).map(([s]) => s).slice(0, 4);
}

export function locationFrom(text: string): string | null {
  const m = /\b(Kenya|Nigeria|Ghana|South Africa|Rwanda|Uganda|Tanzania|Ethiopia|Egypt|East Africa|West Africa|Africa|Global|Worldwide)\b/.exec(text);
  return m ? (m[1] === "Worldwide" ? "Global" : m[1]) : null;
}

export function summaryFrom(text: string): string {
  const body = text.replace(/(application )?deadline:?\s*[^\n]*?\b20\d{2}\b[^A-Za-z\n]*/i, "").replace(/(application )?deadline:?\s*(unspecified|on rolling basis|rolling)\.?\s*/i, "").replace(/the post .* appeared first on .*/i, "").replace(/\s+/g, " ").trim();
  const first = body.split(/(?<=[.!?])\s/).slice(0, 2).join(" ");
  return clip(first, 280);
}
