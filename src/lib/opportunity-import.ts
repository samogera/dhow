import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BENEFITS, ELIGIBILITY, decodeEntities, extractDeadline, isNotAnOpportunity, kindFrom, locationFrom, ogImage, sameOpportunity,
  sectionPoints, sectorsFrom, stripTags, summaryFrom,
} from "@/lib/opportunity-parse";

// Pulls opportunities from public sources into the staff review queue.
//   wordpress   the site's public WordPress REST API (title, link, featured image, full post), falling back to its RSS feed
//   rss         any RSS feed; each new post's page is read once for its share image and key facts
//   grants_gov  Grants.gov's public search API (no key); the source URL carries ?keyword=...
// Imported posts are drafts unless the source is set to auto-publish.

const UA = "DhowOS/1.0 (+https://dhowpartners.com; opportunities digest for members)";
const PER_SOURCE = 12;

export interface Source {
  id: string; name: string; kind: "wordpress" | "rss" | "grants_gov"; url: string;
  auto_publish: boolean; requires_verified: boolean;
}

interface Item {
  externalId: string; title: string; link: string; text: string; html: string;
  categories: string[]; image: string | null;
}

async function get(url: string, init?: RequestInit) {
  return fetch(url, { ...init, headers: { "User-Agent": UA, Accept: "application/json, application/rss+xml, text/html;q=0.9", ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
}

const normLink = (u: string) => u.replace(/[?#].*$/, "").replace(/\/+$/, "");

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fromWordPress(base: string): Promise<Item[] | null> {
  const r = await get(`${base.replace(/\/+$/, "")}/wp-json/wp/v2/posts?per_page=${PER_SOURCE}&_embed=wp:featuredmedia,wp:term`).catch(() => null);
  if (!r?.ok || !(r.headers.get("content-type") ?? "").includes("json")) return null;
  const posts = (await r.json().catch(() => null)) as any[] | null;
  if (!Array.isArray(posts)) return null;
  return posts.map((p) => {
    const html = String(p.content?.rendered ?? "");
    const terms = ((p._embedded?.["wp:term"] ?? []) as any[]).flat().map((t) => decodeEntities(String(t?.name ?? ""))).filter(Boolean);
    const media = p._embedded?.["wp:featuredmedia"]?.[0];
    const image = media?.media_details?.sizes?.large?.source_url ?? media?.source_url ?? p.jetpack_featured_media_url ?? null;
    return {
      externalId: normLink(String(p.link)), title: stripTags(String(p.title?.rendered ?? "")), link: String(p.link),
      text: stripTags(`${p.excerpt?.rendered ?? ""}\n${html}`), html, categories: terms,
      image: typeof image === "string" && image.startsWith("https://") ? image : null,
    };
  });
}

function tag(xml: string, name: string) {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i").exec(xml);
  return m ? m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim() : "";
}

async function fromRss(feedUrl: string, enrichPages: boolean): Promise<Item[]> {
  const r = await get(feedUrl);
  if (!r.ok) throw new Error(`Feed returned ${r.status}`);
  const xml = await r.text();
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].slice(0, PER_SOURCE).map((m) => m[0]);
  const out: Item[] = [];
  for (const it of items) {
    const link = decodeEntities(tag(it, "link"));
    if (!/^https:\/\//i.test(link)) continue;
    const content = tag(it, "content:encoded");
    const desc = tag(it, "description");
    const categories = [...it.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((c) => decodeEntities(c[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1")));
    const enclosure = /<(?:media:content|enclosure)[^>]+url=["'](https:[^"']+)["']/i.exec(it)?.[1] ?? null;
    out.push({ externalId: normLink(link), title: stripTags(decodeEntities(tag(it, "title"))), link, html: content, text: stripTags(`${desc}\n${content}`), categories, image: enclosure });
  }
  if (enrichPages) {
    // Feeds carry only excerpts: read each post page once for its share image and the key-facts sections.
    for (const it of out) {
      if (it.html && it.image) continue;
      const page = await get(it.link).then((x) => (x.ok ? x.text() : "")).catch(() => "");
      if (!page) continue;
      it.image ??= ogImage(page);
      const article = /<article[\s\S]*?<\/article>/i.exec(page)?.[0] ?? page;
      if (!it.html) it.html = article;
      it.text = `${it.text}\n${stripTags(article).slice(0, 6000)}`;
    }
  }
  return out;
}

async function fromGrantsGov(sourceUrl: string): Promise<Item[]> {
  const keyword = new URL(sourceUrl).searchParams.get("keyword") ?? "Africa";
  const r = await get("https://api.grants.gov/v1/api/search2", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, oppStatuses: "posted", rows: PER_SOURCE }),
  });
  if (!r.ok) throw new Error(`Grants.gov returned ${r.status}`);
  const j = (await r.json()) as { data?: { oppHits?: any[] } };
  return (j.data?.oppHits ?? []).map((h) => {
    const close = String(h.closeDate ?? ""); // MM/DD/YYYY
    const [mm, dd, yyyy] = close.split("/");
    const deadline = yyyy ? `Deadline: ${new Date(Date.UTC(+yyyy, +mm - 1, +dd)).toUTCString().slice(5, 16)}` : "";
    return {
      externalId: `grants.gov:${h.id}`, title: String(h.title ?? ""), link: `https://www.grants.gov/search-results-detail/${h.id}`,
      text: `${deadline}\n${h.agency ?? ""} · ${h.number ?? ""}`, html: "", categories: ["Grant"], image: null,
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function importSource(src: Source): Promise<{ found: number; added: number }> {
  let items: Item[];
  if (src.kind === "grants_gov") items = await fromGrantsGov(src.url);
  else if (src.kind === "wordpress") items = (await fromWordPress(src.url)) ?? (await fromRss(`${src.url.replace(/\/+$/, "")}/feed/`, true));
  else items = await fromRss(src.url, true);

  const db = createAdminClient();
  const ids = items.map((i) => i.externalId);
  const { data: existing } = ids.length ? await db.from("opportunities").select("external_id").in("external_id", ids) : { data: [] };
  const seen = new Set((existing ?? []).map((e) => e.external_id));
  const today = new Date().toISOString().slice(0, 10);

  // Recent titles, to skip the same call already imported from another site.
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: recent } = await db.from("opportunities").select("title, deadline").gte("created_at", since).limit(1000);
  const known = (recent ?? []) as { title: string; deadline: string | null }[];

  const rows: Record<string, unknown>[] = [];
  for (const i of items) {
    if (!i.title || seen.has(i.externalId) || isNotAnOpportunity(i.title)) continue;
    const deadline = extractDeadline(i.text);
    if (deadline && deadline < today) continue;
    if (known.some((k) => (k.deadline ?? null) === deadline && sameOpportunity(k.title, i.title))) continue;
    const summary = summaryFrom(i.text);
    const head = `${i.title} ${i.categories.join(" ")} ${summary}`;
    rows.push({
      kind: kindFrom(i.title, i.categories),
      title: i.title.slice(0, 200),
      summary,
      body: "",
      source: src.name,
      url: i.link,
      location: locationFrom(`${i.title} ${summary}`, i.categories),
      deadline,
      requires_verified: src.requires_verified,
      published: src.auto_publish,
      image_url: i.image,
      eligibility: i.html ? sectionPoints(i.html, ELIGIBILITY) : [],
      benefits: i.html ? sectionPoints(i.html, BENEFITS) : [],
      sectors: sectorsFrom(head),
      source_id: src.id,
      external_id: i.externalId,
      imported_at: new Date().toISOString(),
    });
    known.push({ title: i.title, deadline });
  }

  if (rows.length) {
    const { error } = await db.from("opportunities").upsert(rows, { onConflict: "external_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  return { found: items.length, added: rows.length };
}

/** Runs every active source; records how each one went. */
export async function importAllSources() {
  const db = createAdminClient();
  const { data: sources } = await db.from("opportunity_sources").select("id, name, kind, url, auto_publish, requires_verified").eq("active", true);
  const results: { name: string; added: number; error?: string }[] = [];
  for (const src of (sources ?? []) as Source[]) {
    try {
      const r = await importSource(src);
      await db.from("opportunity_sources").update({ last_run_at: new Date().toISOString(), last_count: r.added, last_error: null }).eq("id", src.id);
      results.push({ name: src.name, added: r.added });
    } catch (e) {
      const msg = (e as Error).message.slice(0, 300);
      await db.from("opportunity_sources").update({ last_run_at: new Date().toISOString(), last_error: msg }).eq("id", src.id);
      results.push({ name: src.name, added: 0, error: msg });
    }
  }
  return results;
}
