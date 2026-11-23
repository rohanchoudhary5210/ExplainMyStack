# ExplainMyStack

A Chrome Manifest V3 side-panel extension and Python FastAPI backend for understanding **public GitHub source code**.

## How I built this

- **Idea and design:** ExplainMyStack started as a hackathon idea (January 2026). The requirements, design and architecture docs in this repo (`requirements.md`, `design.md`, `architecture.md`) came from that stage.
- **Code:** the current backend and extension were written in November 2026 with heavy help from AI coding assistants. I drove the scope, reviewed the code, and ran and extended the tests.
- **What I focused on:** request validation, clear error codes when the LLM provider fails, and tests that run without network access.

## Features

- **Explain This File:** structured AI explanation of the currently open GitHub file
- **Ask About Repository:** answer a natural-language question from a bounded selection of up to eight likely relevant source files, with the file paths returned for inspection
- Mock mode for development without an OpenAI API key
- Request timeouts, Markdown escaping, API error reporting and automated tests
- Optional API-token protection for local experimentation

> Repository Q&A is a **limited-context preview**, not a full-codebase semantic index, autonomous agent, or guaranteed exhaustive security audit. File selection is heuristic.

## Quick start

1. Install Python 3.12+ and Google Chrome.
2. Open a terminal in `backend`, then run:
   ```sh
   python -m venv .venv
   # Windows: .venv\Scripts\activate
   # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
3. For real AI responses, create `backend/.env` with `OPENAI_API_KEY=your_key`. Without one, the app returns explicit mock responses.
4. In Chrome open `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose the `extension` directory.
5. Open a public GitHub repository or file. Click the extension icon to open its side panel.
6. Use **Explain This File** on a file page, or enter a question and use **Ask About Repository** from anywhere inside that repository.

## Backend endpoints

- `GET /health` — health check
- `POST /explain-file` — `{"repo_name":"owner/repo","file_path":"src/a.py","code_content":"print(1)"}`
- `POST /ask-repository` — `{"repo_name":"owner/repo","question":"Where is the entry point?"}`

Repository questions use GitHub's **public REST and raw-content endpoints** and don't access private repositories. A small number of source files are selected using file-path keywords, size limits and configuration-file priorities.

## Security and deployment

**By default the backend is for localhost development only.** Keep uvicorn bound to `127.0.0.1`, never to an internet-facing address without configuring proper authentication, TLS, a trusted extension ID, rate limits, and usage quotas.

- Optional `EXPLAINMYSTACK_API_TOKEN` activates `X-API-Token` validation on AI endpoints. Enter the same token in the extension's **Local backend settings**. The token is not persisted.
- This static shared token is suitable for local development and trusted environments **only**. It is not a production multi-user authentication system.
- CORS is restricted to Chrome extension origin format and localhost; **CORS does not replace authentication**.
- Do not paste confidential source code into the extension: explanations send source content to the configured AI provider.
- Never check `.env` or API keys into version control.
- Prompt injections embedded in repositories are treated as untrusted text, but prompt guidance alone cannot guarantee protection.
- Repository retrieval limits file sizes and source extensions. It doesn't execute repository code.

## Tests

From `backend`: `python -m pytest -q`

From repository root with Node.js 22+: `node --test extension/tests/*.test.cjs`.

GitHub Actions runs both suites for pushed changes and pull requests.

## Known limitations

- GitHub changes its DOM and embedded metadata formats; manually test file extraction periodically.
- GitHub URL parsing without embedded ref metadata is ambiguous for branch names containing slashes.
- GitHub public API rate limits and timeouts may affect repository analysis.
- Selected files may omit a relevant implementation; responses must acknowledge missing context.
- Only public repositories are supported, and no persistent memory, RAG embedding index, or autonomous code-changing features are implemented yet.

## Roadmap

1. Improve extension UI testing and GitHub file extraction across layouts.
2. Add authenticated user sessions, server-side quotas, logging without code leakage, and cloud deployment hardening.
3. Add repository indexes, citations to code lines, graph navigation and incremental retrieval.
4. Add agentic code review and proposed patches behind explicit user approval.

## License

MIT, see [LICENSE](LICENSE).
