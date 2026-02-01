# ExplainMyStack - Requirements

## Goal
Build a production-quality Chrome Extension that works on GitHub.com and explains the currently opened file in a repository using AI.

## Core User Flow
1.  **User Action**: User opens any public GitHub repository and clicks on a file.
2.  **Trigger**: User opens the Chrome Extension side panel and clicks "Explain This File".
3.  **Extraction**: The extension reads the file content visible on the page, the repository name, and the file path.
4.  **Processing**: The extension sends this data to a FastAPI backend.
5.  **AI Analysis**: The backend calls an LLM (e.g., OpenAI) to generate a structured explanation.
6.  **Display**: The explanation is shown in a clean, developer-friendly side panel.

## Constraints
-   **Platform**: Chrome Extension (Manifest V3).
-   **Scope**: Must work only on `github.com`.
-   **Auth**: No user authentication required for MVP.
-   **Target**: Public repositories only.
-   **UI**: Simple, clean (developer-tool style).
-   **Performance**: Fast loading states and response times.

## Backend Requirements
-   **Framework**: FastAPI.
-   **Endpoint**: Single `POST /explain-file`.
-   **Input**: JSON `{ repo_name, file_path, code_content }`.
-   **Output**: Markdown text.
-   **Logic**: Call an LLM using a well-structured prompt.

## Extension Requirements
-   **Permissions**: `sidePanel`, `activeTab`, `scripting`.
-   **Components**:
    -   Content Script: Extract file content from DOM.
    -   Side Panel: Display UI and results.
    -   Background: Manage side panel opening behavior.
