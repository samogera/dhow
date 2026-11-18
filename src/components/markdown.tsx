import type { ReactNode } from "react";

/**
 * A small, safe Markdown renderer. It builds React elements only (no raw HTML),
 * so nothing a writer types can inject scripts. Supports headings, lists,
 * paragraphs, blockquotes, code blocks, bold, italics, inline code and links.
 */
export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      out.push(<pre key={key++} className="mb-4 overflow-x-auto rounded-2xl bg-sunken p-4 text-sm"><code>{body.join("\n")}</code></pre>);
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const Tag = (["h1", "h2", "h3"] as const)[h[1].length - 1];
      out.push(<Tag key={key++}>{inline(h[2])}</Tag>);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/, ""));
        i++;
      }
      const List = ordered ? "ol" : "ul";
      out.push(<List key={key++}>{items.map((t, j) => <li key={j}>{taskItem(t)}</li>)}</List>);
      continue;
    }
    if (line.startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) body.push(lines[i++].replace(/^>\s?/, ""));
      out.push(<blockquote key={key++} className="mb-4 rounded-2xl border-l-4 border-mint bg-sunken px-4 py-3 text-ink/80">{inline(body.join(" "))}</blockquote>);
      continue;
    }
    if (/^---+$/.test(line.trim())) { out.push(<hr key={key++} className="my-6 border-line" />); i++; continue; }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>|\s*[-*]\s|\s*\d+[.)]\s)/.test(lines[i])) para.push(lines[i++]);
    out.push(<p key={key++}>{inline(para.join(" "))}</p>);
  }
  return <div className="prose-dhow">{out}</div>;
}

function taskItem(t: string): ReactNode {
  const m = /^\[( |x)\]\s+(.*)$/i.exec(t);
  if (!m) return inline(t);
  return <span className="inline-flex items-center gap-2"><input type="checkbox" disabled defaultChecked={m[1].toLowerCase() === "x"} className="accent-navy-900" />{inline(m[2])}</span>;
}

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    if (m[1]) parts.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else if (m[2]) parts.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (m[3]) parts.push(<em key={k++}>{t.slice(1, -1)}</em>);
    else {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t)!;
      const href = lm[2];
      const safe = /^(https?:\/\/|mailto:|\/)/i.test(href);
      parts.push(safe ? <a key={k++} href={href} target={href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">{lm[1]}</a> : lm[1]);
    }
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
