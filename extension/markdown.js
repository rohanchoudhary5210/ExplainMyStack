// Minimal, safe Markdown renderer: escapes all HTML first, then handles
// headings, fenced code, lists, bold and inline code (what the LLM returns).
// shortcut: no tables/links/nested lists; swap in a full parser if responses need them.

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(s) {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderMarkdown(md) {
  const out = [];
  let inCode = false, inList = false;
  for (const raw of escapeHtml(md).split("\n")) {
    if (raw.trim().startsWith("```")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) { out.push(raw); continue; }
    const item = raw.match(/^\s*[-*]\s+(.*)/);
    if (item) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(item[1])}</li>`);
      continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    const h = raw.match(/^(#{1,4})\s+(.*)/);
    if (h) out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    else if (raw.trim()) out.push(`<p>${inline(raw)}</p>`);
  }
  if (inList) out.push("</ul>");
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

if (typeof module !== "undefined") module.exports = { renderMarkdown };
