"""Read a small, bounded selection of source files from a public GitHub repository.

No arbitrary URLs, local paths, private-repository credentials or code execution.
This is bounded context selection, not a full repository index.
"""
import json
import re
import urllib.error
import urllib.parse
import urllib.request

from app.llm_service import LLMError

REPO_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
ALLOWED_EXTENSIONS = (".py", ".js", ".jsx", ".ts", ".tsx", ".dart", ".gd", ".cs", ".go", ".rs", ".java", ".json", ".yaml", ".yml", ".toml", ".md", ".html", ".css")
MAX_FILES = 8
MAX_FILE_CHARS = 5000
MAX_TOTAL_CHARS = 24000
MAX_TREE_ENTRIES = 3000


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "ExplainMyStack/1.1", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=8) as response:
        return json.load(response)


def fetch_source(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "ExplainMyStack/1.1"})
    with urllib.request.urlopen(req, timeout=8) as response:
        data = response.read(MAX_FILE_CHARS * 4 + 1)
    if len(data) > MAX_FILE_CHARS * 4:
        return ""
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return ""


def collect_context(repo_name: str, question: str) -> tuple[str, list[str]]:
    if not REPO_PATTERN.fullmatch(repo_name) or ".." in repo_name:
        raise ValueError("Invalid repository name")
    owner, name = repo_name.split("/")
    base = f"https://api.github.com/repos/{urllib.parse.quote(owner)}/{urllib.parse.quote(name)}"
    try:
        metadata = fetch_json(base)
        if metadata.get("private"):
            raise ValueError("Only public repositories are supported")
        default_branch = metadata["default_branch"]
        tree = fetch_json(base + "/git/trees/" + urllib.parse.quote(default_branch, safe="") + "?recursive=1")
    except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as error:
        if isinstance(error, ValueError) and "Only public" in str(error):
            raise
        raise LLMError("Could not read the public repository from GitHub") from error

    entries = tree.get("tree", [])
    if tree.get("truncated") or len(entries) > MAX_TREE_ENTRIES:
        raise ValueError("Repository tree is too large for this lightweight analyzer")
    words = set(re.findall(r"[a-z0-9_]{3,}", question.lower()))
    candidates = []
    for item in entries:
        path = item.get("path", "")
        if item.get("type") != "blob" or not path.lower().endswith(ALLOWED_EXTENSIONS):
            continue
        if any(part in {"node_modules", "vendor", "dist", "build", ".git", ".next"} for part in path.split("/")):
            continue
        if item.get("size", 0) > MAX_FILE_CHARS * 4:
            continue
        score = sum(3 for word in words if word in path.lower())
        if path.lower().split("/")[-1] in {"readme.md", "package.json", "pubspec.yaml", "requirements.txt", "pyproject.toml", "project.godot"}:
            score += 2
        score -= path.count("/") * 0.2
        candidates.append((score, path))
    candidates.sort(key=lambda item: (-item[0], item[1]))
    chosen, snippets, total = [], [], 0
    for _, path in candidates:
        if len(chosen) >= MAX_FILES or total >= MAX_TOTAL_CHARS:
            break
        safe_path = "/".join(urllib.parse.quote(part, safe="") for part in path.split("/"))
        url = f"https://raw.githubusercontent.com/{urllib.parse.quote(owner)}/{urllib.parse.quote(name)}/{urllib.parse.quote(default_branch, safe='')}/{safe_path}"
        try:
            source = fetch_source(url)
        except (urllib.error.URLError, TimeoutError):
            continue
        if not source.strip():
            continue
        source = source[: min(MAX_FILE_CHARS, MAX_TOTAL_CHARS - total)]
        total += len(source)
        chosen.append(path)
        snippets.append(f"FILE: {path}\n{source}")
    if not chosen:
        raise ValueError("No supported text files could be retrieved from this repository")
    return "\n\n".join(snippets), chosen
