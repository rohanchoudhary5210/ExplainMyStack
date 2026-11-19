const API_URL = "http://127.0.0.1:8000/explain-file";
const REQUEST_TIMEOUT_MS = 30000;

const button = document.getElementById("explain");
const statusEl = document.getElementById("status");
const fileEl = document.getElementById("file");
const resultEl = document.getElementById("result");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = isError ? "error" : "";
}

async function getFileFromTab(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "GET_FILE" });
  } catch {
    // The page was open before the extension loaded: inject the content script, then retry.
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return chrome.tabs.sendMessage(tabId, { type: "GET_FILE" });
  }
}

button.addEventListener("click", async () => {
  button.disabled = true;
  resultEl.innerHTML = "";
  setStatus("Reading file…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.startsWith("https://github.com/")) throw new Error("Open a file on github.com first.");

    const file = await getFileFromTab(tab.id);
    if (!file || file.error) throw new Error(file?.error || "Could not read the page.");
    fileEl.textContent = `${file.repo_name} · ${file.file_path}`;

    setStatus("Asking the AI…");
    let res;
    try {
      res = await fetch(API_URL, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(file),
      });
    } catch (err) {
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        throw new Error("The AI request timed out after 30 seconds. Please try again.");
      }
      throw new Error("Backend not reachable. Is uvicorn running on 127.0.0.1:8000?");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = Array.isArray(data.detail) ? "This file is empty or too large to explain." : data.detail;
      throw new Error(detail || `Backend error (HTTP ${res.status}).`);
    }
    resultEl.innerHTML = renderMarkdown(data.explanation);
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    button.disabled = false;
  }
});
