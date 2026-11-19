const API_BASE = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 30000;

const button = document.getElementById("explain");
const askButton = document.getElementById("ask-repository");
const questionEl = document.getElementById("question");
const tokenEl = document.getElementById("api-token");
const statusEl = document.getElementById("status");
const fileEl = document.getElementById("file");
const resultEl = document.getElementById("result");
const sourcesEl = document.getElementById("sources");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = isError ? "error" : "";
}

async function getFileFromTab(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "GET_FILE" });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return chrome.tabs.sendMessage(tabId, { type: "GET_FILE" });
  }
}

async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith("https://github.com/")) {
    throw new Error("Open a GitHub repository first.");
  }
  return tab;
}

function repoFromTab(tab) {
  const url = new URL(tab.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2 || !/^[A-Za-z0-9_.-]+$/.test(parts[0]) ||
      !/^[A-Za-z0-9_.-]+$/.test(parts[1])) {
    throw new Error("Open a GitHub repository first.");
  }
  return parts.slice(0, 2).join("/");
}

async function apiRequest(path, data) {
  const headers = { "Content-Type": "application/json" };
  if (tokenEl.value.trim()) headers["X-API-Token"] = tokenEl.value.trim();
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error("Request timed out after 30 seconds. Try again.");
    }
    throw new Error("Backend not reachable. Start uvicorn on 127.0.0.1:8000.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body.detail) ? "Invalid or oversized input." : body.detail;
    throw new Error(detail || `Backend error (HTTP ${res.status}).`);
  }
  return body;
}

async function run(buttonEl, task) {
  buttonEl.disabled = true;
  resultEl.textContent = "";
  sourcesEl.textContent = "";
  try {
    await task();
    setStatus("");
  } catch (error) {
    setStatus(error.message || "Unexpected error", true);
  } finally {
    buttonEl.disabled = false;
  }
}

button.addEventListener("click", () => run(button, async () => {
  setStatus("Reading file…");
  const tab = await getTab();
  const file = await getFileFromTab(tab.id);
  if (!file || file.error) throw new Error(file?.error || "Could not read this file.");
  fileEl.textContent = `${file.repo_name} · ${file.file_path}`;
  setStatus("Explaining file…");
  const data = await apiRequest("/explain-file", file);
  resultEl.innerHTML = renderMarkdown(data.explanation);
}));

askButton.addEventListener("click", () => run(askButton, async () => {
  const question = questionEl.value.trim();
  if (question.length < 5) throw new Error("Enter a question with at least 5 characters.");
  const repo_name = repoFromTab(await getTab());
  fileEl.textContent = repo_name;
  setStatus("Reading selected repository files and asking AI…");
  const data = await apiRequest("/ask-repository", { repo_name, question });
  resultEl.innerHTML = renderMarkdown(data.explanation);
  sourcesEl.textContent = "Files analyzed: " + data.analyzed_files.join(", ");
}));
