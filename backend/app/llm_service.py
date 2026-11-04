"""Builds the prompt and calls the LLM. Falls back to Mock Mode when no API key is set."""
import json
import os
import urllib.error
import urllib.request

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
TIMEOUT_SECONDS = 60

SYSTEM_PROMPT = (
    "You are a senior engineer onboarding a new developer to this codebase. "
    "Explain the file clearly and concisely in Markdown. Do not invent code that is not shown."
)


class LLMError(Exception):
    """The LLM provider failed or returned something unusable."""


def build_prompt(repo_name: str, file_path: str, code_content: str) -> str:
    return (
        f"Repository: {repo_name}\n"
        f"File: {file_path}\n\n"
        "Explain this file using exactly these Markdown sections:\n"
        "## What this file does\n"
        "## Why it exists\n"
        "## Key dependencies\n"
        "## Potential risks\n\n"
        f"```\n{code_content}\n```"
    )


def mock_explanation(repo_name: str, file_path: str) -> str:
    return (
        f"## What this file does\nMock Mode: `{file_path}` in `{repo_name}` was received.\n\n"
        "## Why it exists\nSet `OPENAI_API_KEY` to get a real explanation.\n\n"
        "## Key dependencies\n- None (mock response)\n\n"
        "## Potential risks\n- None (mock response)"
    )


def explain_file(repo_name: str, file_path: str, code_content: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return mock_explanation(repo_name, file_path)

    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_prompt(repo_name, file_path, code_content)},
        ],
        "temperature": 0.2,
    }).encode()
    req = urllib.request.Request(
        OPENAI_URL,
        data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            data = json.load(resp)
        return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        raise LLMError(f"LLM provider returned HTTP {e.code}") from e
    except (urllib.error.URLError, TimeoutError) as e:
        raise LLMError("Could not reach the LLM provider") from e
    except (KeyError, IndexError, ValueError) as e:
        raise LLMError("LLM provider returned an unexpected response") from e
