# ExplainMyStack - Setup Instructions

## 1. Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```

2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

3.  (Optional) Set your OpenAI API Key:
    - Copy `backend/.env.example` to `backend/.env`
    - Add: `OPENAI_API_KEY=sk-...`
    - *Note: If you skip this, the backend will run in "Mock Mode" and provide static responses.*

4.  Start the server:
    ```bash
    uvicorn app.main:app --reload
    ```
    You should see: `Uvicorn running on http://127.0.0.1:8000`

## 2. Extension Setup

1.  Open Google Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked**.
4.  Select the `extension` folder of this repository.

## 3. Usage

1.  Go to any public GitHub repository (e.g., [this repo](https://github.com/fastapi/fastapi)).
2.  Open a file (e.g., `README.md` or a `.py` file).
3.  Click the **ExplainMyStack** icon in the Chrome toolbar.
    - *Tip: Pin it for easy access.*
4.  The side panel will open.
5.  Click **"Explain This File"**.
6.  The AI explanation will appear in the panel!

## 4. Run the tests

From `backend/`:
```bash
pytest
```
The tests run in Mock Mode, so no API key or network is needed. They cover the health check, the response sections, input validation (bad repo names, empty or oversized files) and the 502 returned when the LLM provider fails.

## Troubleshooting

-   **"Could not read this file's content"**: Refresh the GitHub page. (If the page was open before the extension loaded, the side panel injects the content script automatically.)
-   **Backend Error**: Ensure the terminal running `uvicorn` is still active.
