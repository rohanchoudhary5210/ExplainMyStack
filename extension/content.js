// Extract metadata and source text from the GitHub file page.
// GitHub can change its DOM; prefer structured page data when available.
function embeddedPayload() {
  const node = document.querySelector('script[data-target="react-app.embeddedData"]');
  if (!node?.textContent) return null;
  try {
    const data = JSON.parse(node.textContent);
    return data.payload || data;
  } catch {
    return null;
  }
}

function parseGitHubUrl(pathname, payload = embeddedPayload()) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 5 || parts[2] !== "blob") return null;

  const repo_name = `${parts[0]}/${parts[1]}`;
  // The branch/ref may contain slashes. GitHub's embedded refInfo + path
  // avoids the ambiguity of splitting the URL at a fixed index.
  const path = payload?.path;
  const ref = payload?.refInfo?.name;
  if (typeof path === "string" && path.length && typeof ref === "string" && ref.length) {
    const expected = `/${parts[0]}/${parts[1]}/blob/${ref.split("/").map(encodeURIComponent).join("/")}/${path.split("/").map(encodeURIComponent).join("/")}`;
    if (decodeURI(expected) === decodeURI(pathname)) {
      return { repo_name, file_path: path };
    }
  }

  // Without ref metadata the URL is ambiguous for branches containing "/".
  // A best-effort fallback supports the common one-segment ref case.
  let fallback;
  try {
    fallback = decodeURIComponent(parts.slice(4).join("/"));
  } catch {
    return null;
  }
  return fallback ? { repo_name, file_path: fallback } : null;
}

function readCode(payload = embeddedPayload()) {
  const rawLines = payload?.blob?.rawLines;
  if (Array.isArray(rawLines) && rawLines.every(line => typeof line === "string")) {
    return rawLines.join("\n");
  }
  const textarea = document.querySelector("#read-only-cursor-text-area");
  if (textarea && typeof textarea.value === "string" && textarea.value.trim()) {
    return textarea.value;
  }
  // On rendered Markdown pages, this is a fallback only: formatting may differ
  // from original Markdown source.
  const article = document.querySelector("article.markdown-body");
  if (article?.innerText?.trim()) return article.innerText;
  const lines = [...document.querySelectorAll(".blob-code-inner")].map(el => el.innerText);
  return lines.length ? lines.join("\n") : "";
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "GET_FILE") return;
  const payload = embeddedPayload();
  const meta = parseGitHubUrl(location.pathname, payload);
  if (!meta) {
    sendResponse({ error: "Open a file inside a GitHub repository first." });
    return;
  }
  const code_content = readCode(payload);
  if (!code_content.trim()) {
    sendResponse({ error: "Could not read this file's source. Try refreshing the page." });
    return;
  }
  if (code_content.length > 60000) {
    sendResponse({ error: "This file is too large to explain (60,000 character limit)." });
    return;
  }
  sendResponse({ ...meta, code_content });
});
