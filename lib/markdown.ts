// Minimal, HTML-escaping Markdown renderer for the editor preview. The website renders the stored
// Markdown itself; this only needs to be faithful enough for headings, emphasis, links, lists and quotes.
const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const inline = (raw: string): string =>
  escapeHtml(raw)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let paragraph: string[] = [];
  let inCode = false;

  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const flush = () => { if (paragraph.length) { out.push(`<p>${inline(paragraph.join(" "))}</p>`); paragraph = []; } };

  for (const line of lines) {
    if (line.startsWith("```")) {
      flush(); closeList();
      out.push(inCode ? "</pre>" : "<pre>");
      inCode = !inCode;
      continue;
    }
    if (inCode) { out.push(escapeHtml(line) + "\n"); continue; }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);

    if (heading) { flush(); closeList(); out.push(`<h${heading[1]!.length}>${inline(heading[2]!)}</h${heading[1]!.length}>`); }
    else if (bullet || ordered) {
      flush();
      const kind = bullet ? "ul" : "ol";
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline((bullet || ordered)![1]!)}</li>`);
    }
    else if (quote) { flush(); closeList(); out.push(`<blockquote>${inline(quote[1]!)}</blockquote>`); }
    else if (/^---+$/.test(line.trim())) { flush(); closeList(); out.push("<hr />"); }
    else if (!line.trim()) { flush(); closeList(); }
    else paragraph.push(line.trim());
  }
  flush(); closeList();
  if (inCode) out.push("</pre>");
  return out.join("\n");
}
