// Reads the repo name, file path and file content from a GitHub file page.

function parseGitHubUrl(pathname) {
  // /owner/repo/blob/<branch>/<path...>
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 5 || parts[2] !== "blob") return null;
  // shortcut: assumes the branch name has no "/" (e.g. feature/x gives a wrong path); read the path from the page breadcrumb if that matters
  return {
    repo_name: `${parts[0]}/${parts[1]}`,
    file_path: decodeURIComponent(parts.slice(4).join("/")),
  };
}

function readCode() {
  // GitHub's React code view keeps the whole file in a hidden read-only textarea.
  const textarea = document.querySelector("#read-only-cursor-text-area");
  if (textarea && textarea.value.trim()) return textarea.value;
  // Rendered Markdown files (README.md etc.).
  const article = document.querySelector("article.markdown-body");
  if (article && article.innerText.trim()) return article.innerText;
  // Older line-by-line view.
  const lines = [...document.querySelectorAll(".blob-code-inner")].map((el) => el.innerText);
  return lines.length ? lines.join("\n") : "";
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "GET_FILE") return;
  const meta = parseGitHubUrl(location.pathname);
  if (!meta) {
    sendResponse({ error: "Open a file inside a GitHub repository first." });
    return;
  }
  const code_content = readCode();
  if (!code_content) {
    sendResponse({ error: "Could not read this file's content. Try refreshing the page." });
    return;
  }
  sendResponse({ ...meta, code_content });
});
