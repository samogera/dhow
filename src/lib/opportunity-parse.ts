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
  return decodeEntities(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|h[1-6]|li|tr|section|article|blockquote)>/gi, "\n").replace(/<[^>]+>/g, " "))
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
  const m =
    /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["']/i.exec(html) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/i.exec(html) ??
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i.exec(html);
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

export function locationFrom(text: string, categories: string[] = []): string | null {
  const continents = categories.filter((c) => /^(africa|america|asia|europe|australia|oceania|middle east)/i.test(c.trim())).length;
  if (continents >= 3) return "Global";
  const m = /\b(Kenya|Nigeria|Ghana|South Africa|Rwanda|Uganda|Tanzania|Ethiopia|Egypt|East Africa|West Africa|Africa|Global|Worldwide)\b/.exec(text);
  return m ? (m[1] === "Worldwide" ? "Global" : m[1]) : null;
}

export function summaryFrom(text: string): string {
  let body = text.replace(/the post .* appeared first on .*/i, "").replace(/\s+/g, " ").trim();
  // Start at the announcement itself, skipping deadline fragments like "at 5PM ET." that precede it.
  const start = body.search(/\b(applications?|nominations|submissions|entries|registration) (are|is) (now )?(open|invited|being accepted)/i);
  if (start > 0 && start < 300) body = body.slice(start);
  else body = body.replace(/(application )?deadline:?\s*[^\n]*?\b20\d{2}\b[^A-Za-z\n]*/i, "").replace(/(application )?deadline:?\s*(unspecified|on rolling basis|rolling)\.?\s*/i, "");
  const first = body.split(/(?<=[.!?])\s/).slice(0, 2).join(" ");
  return clip(first, 280);
}

/** Advice articles and round-ups ("How to…", "21 jobs currently open") are not opportunities. */
export function isNotAnOpportunity(title: string): boolean {
  return /^(how to|why |what |\d+\s+(tips|ways|things|reasons))|\btips\b|currently open|hot jobs|round-?up|weekly digest|^\d+\s+(scholarships|jobs|opportunities|grants|fellowships)/i.test(title);
}

/** Words that identify an opportunity, for spotting the same call posted by two sites. */
export function titleKey(title: string): Set<string> {
  const stop = new Set(["the", "for", "and", "of", "in", "to", "a", "an", "on", "at", "by", "with", "from", "is", "are", "applications", "open", "now", "program", "programme", "2025", "2026", "2027", "2028", "funded", "fully"]);
  return new Set(title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stop.has(w)));
}
export function sameOpportunity(a: string, b: string): boolean {
  const x = titleKey(a), y = titleKey(b);
  if (!x.size || !y.size) return false;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / Math.min(x.size, y.size) >= 0.7;
}

const NOT_APPLY_HOSTS = /(^|\.)(facebook|fb|twitter|x|linkedin|instagram|whatsapp|wa|t|telegram|youtube|youtu|pinterest|reddit|tiktok|google|googleadservices|doubleclick|wp|gravatar|wordpress|feedburner|amazon|bit)\.(com|me|be|ly|net|org)$/i;
const AGGREGATOR_HOSTS = /(opportunitiesforafricans|opportunitydesk|fundsforngos|opportunitiesforyouth|opportunitytracker|afterschoolafrica|youthopportunities|scholarshipregion|opportunitiescorners)\./i;

/** The organiser's own page for applying, found among the post's links ("Apply here", "Official website"…). */
export function applyLinkFrom(html: string, postUrl: string): string | null {
  let own = "";
  try { own = new URL(postUrl).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
  let best: { url: string; score: number } | null = null;
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodeEntities(m[1]).trim();
    let u: URL;
    try { u = new URL(href); } catch { continue; }
    if (!/^https?:$/.test(u.protocol)) continue;
    const host = u.hostname.replace(/^www\./, "");
    if (!host || host === own || host.endsWith(`.${own}`) || NOT_APPLY_HOSTS.test(host) || AGGREGATOR_HOSTS.test(host)) continue;
    if (/\.(jpe?g|png|gif|webp|svg)$/i.test(u.pathname)) continue;
    const t = clean(m[2]).toLowerCase();
    const score = /\bapply|application (form|portal|page)|register|registration|submit|nominat|enter (now|here)/.test(t) ? 4
      : /official/.test(t) ? 3
      : /website|learn more|more (info|information|details)|click here|^here$|visit|details|portal/.test(t) ? 1 : 0;
    if (score && (!best || score > best.score)) best = { url: u.toString(), score };
  }
  return best?.url ?? null;
}

/** A short description for the opportunity page: the post's opening paragraphs, without deadlines and boilerplate. */
export function aboutFrom(text: string, max = 700): string {
  const paras = text.replace(/the post .* appeared first on .*/gi, "").split(/\n+/).map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 60 && !/^(application )?deadline\b/i.test(p) && !/(subscribe|newsletter|follow us|share this|related posts?|click here to|join our)/i.test(p));
  const out: string[] = [];
  let len = 0;
  for (const p of paras) {
    if (out.some((o) => o === p)) continue;
    if (len + p.length > max) { if (!out.length) out.push(clip(p, max)); break; }
    out.push(p); len += p.length;
    if (out.length >= 3) break;
  }
  return out.join("\n\n");
}

/** Splits a long post title into a clear headline, a "for whom" line and a highlight (e.g. "US$250,000 prize"). */
export function splitTitle(title: string): { headline: string; sub: string | null; tag: string | null } {
  let t = title.replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
  let tag: string | null = null;
  const paren = /\s*\(([^()]{3,60})\)$/.exec(t);
  if (paren) { tag = paren[1].trim(); t = t.slice(0, paren.index).trim(); }
  t = t.replace(/^the\s+(?=[A-Z0-9])/i, "").replace(/^(call for applications|applications (are )?open( for)?)\s*[:–-]?\s*/i, "");
  let sub: string | null = null;
  const f = /\s+for\s+(?=\S)/i.exec(t);
  if (f && t.slice(0, f.index).split(" ").length >= 3) { sub = `For ${t.slice(f.index + f[0].length)}`; t = t.slice(0, f.index); }
  else {
    const d = /\s+[–—-]\s+/.exec(t);
    if (d && t.slice(0, d.index).split(" ").length >= 3) { sub = t.slice(d.index + d[0].length); t = t.slice(0, d.index); }
  }
  return { headline: t.charAt(0).toUpperCase() + t.slice(1), sub, tag };
}

// ----------------------------------------------------------------- is it open to Kenya?
// Dhow works with companies and people in Kenya and East Africa. An opportunity is:
//   open      it names Kenya / East Africa / Africans in general, or says any nationality can apply
//   excluded  it is limited to other countries (citizens, residents or students elsewhere)
//   check     nothing clear either way: a person decides

export type KenyaFit = { fit: "open" | "check" | "excluded"; reason: string };

const OTHER_PLACES: [RegExp, string][] = [
  [/\bnigeria(n|ns)?\b/i, "Nigeria"], [/\bsouth africa(n|ns)?\b/i, "South Africa"], [/\bghana(ian|ians)?\b/i, "Ghana"],
  [/\b(sadc|southern african development community)\b/i, "SADC countries"], [/\becowas\b/i, "ECOWAS countries"],
  [/\bwest africa(n|ns)?\b/i, "West Africa"], [/\bsouthern africa(n|ns)?\b/i, "Southern Africa"], [/\bnorth africa(n|ns)?\b/i, "North Africa"],
  [/\b(egypt(ian|ians)?|morocc(o|an|ans)|zimbabwe(an|ans)?|zambia(n|ns)?|cameroon(ian|ians)?|senegal(ese)?|botswana|namibia(n|ns)?|malawi(an|ans)?|mozambique)\b/i, "another African country"],
  [/\b(united states|u\.s\.|us citizens?|american (citizens|students|residents|nationals)|state in the united states|ut austin)\b/i, "the United States"],
  [/\b(united kingdom|uk (citizens|residents|nationals|students)|british (citizens|nationals))\b/i, "the UK"],
  [/\b(canad(a|ian|ians))\b/i, "Canada"], [/\baustralia(n|ns)?\b/i, "Australia"], [/\b(eu member states|european union citizens|eu citizens)\b/i, "the EU"],
  [/\b(latin america|latam|caribbean)\b/i, "Latin America"], [/\b(india|indian|pakistan(i|is)?|bangladesh(i|is)?|philippines|filipino)\b/i, "South Asia / Asia"],
];
const RESTRICTS = /\b(citizens? of|residents? of|nationals? of|national of|must be (a|an)? ?\w+ (citizen|national|resident)|for (young |aspiring |early-career |emerging )?\w+ (graduates|students|journalists|youth|entrepreneurs|women|researchers|citizens|nationals)|only open to|open only to|exclusively for|based in|registered in|member states)\b/i;
const OPEN_KENYA = /\b(kenya|kenyan|kenyans|nairobi|east africa|east african|eastern africa|east (and|&) southern africa|eac\b|african (countries|nationals|citizens|youth|entrepreneurs|startups|researchers|women)|(?<!(south|west|north|southern|central) )africans\b|citizen of an african country|sub-saharan africa|across africa|all african)\b/i;
const NAMES_KENYA = /\b(kenya|kenyan|kenyans|nairobi|east africa|east african|eastern africa|east (and|&) southern africa)\b/i;
const COUNTRY_LIST = /\b(eligible countries|eligibility list|list of (eligible )?countries|selected countries|participating countries|\d+\+? (eligible )?countries)\b/i;
const OPEN_ALL = /\b(all nationalities|any nationality|any country|all countries|worldwide|open to (applicants|candidates|everyone|individuals) (from )?(all|any|around the world)|regardless of (nationality|country)|global(ly)? (open|call)|international applicants|from around the world)\b/i;
const US_FUNDING = /\b(broad agency announcement|department of defense|\bdod\b|air force|army research|military academy|notice of intent|fy ?\d{2})\b/i;

export function kenyaFit(o: { title: string; summary?: string | null; eligibility?: string[] | null; location?: string | null; source?: string | null; about?: string | null }): KenyaFit {
  const title = o.title ?? "";
  const elig = (o.eligibility ?? []).join(" ");
  const text = `${title} ${o.summary ?? ""} ${elig} ${o.about ?? ""}`;
  const head = `${title} ${elig}`;

  if (NAMES_KENYA.test(head)) return { fit: "open", reason: "Names Kenya or East Africa" };
  // Targeted at another country in the title ("for young Nigerian graduates", "Bursary for students in South Africa").
  for (const [re, place] of OTHER_PLACES) {
    if (re.test(title) && !OPEN_ALL.test(text) && !/\b((?<!(south|west|north|southern|central) )africans|african countries|across africa)\b/i.test(title)) return { fit: "excluded", reason: `Only for ${place}` };
  }
  // Eligibility limits applicants to another country.
  for (const [re, place] of OTHER_PLACES) {
    if (re.test(elig) && RESTRICTS.test(elig) && !OPEN_KENYA.test(elig) && !OPEN_ALL.test(elig)) return { fit: "excluded", reason: `Eligibility limited to ${place}` };
  }
  if (/grants\.gov/i.test(o.source ?? "") && US_FUNDING.test(title) && !OPEN_KENYA.test(text)) return { fit: "excluded", reason: "US government call for US organisations" };
  if (COUNTRY_LIST.test(text) && !NAMES_KENYA.test(text)) return { fit: "check", reason: "Only some countries: check the list for Kenya" };
  if (OPEN_KENYA.test(text)) return { fit: "open", reason: "Open to Africans or East Africa" };
  if (OPEN_ALL.test(text) || /^global$/i.test(o.location ?? "")) return { fit: "open", reason: "Open worldwide" };
  if (/^africa$/i.test(o.location ?? "")) return { fit: "open", reason: "Open across Africa" };
  return { fit: "check", reason: "Check who can apply" };
}
