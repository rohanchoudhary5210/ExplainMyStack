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
    - Create a `.env` file in `backend/`
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
4.  Select the `extension` folder inside `c:\Users\Asus\Downloads\Hackathon`.

## 3. Usage

1.  Go to any public GitHub repository (e.g., [this repo](https://github.com/fastapi/fastapi)).
2.  Open a file (e.g., `README.md` or a `.py` file).
3.  Click the **ExplainMyStack** icon in the Chrome toolbar.
    - *Tip: Pin it for easy access.*
4.  The side panel will open.
5.  Click **"Explain This File"**.
6.  The AI explanation will appear in the panel!

## Troubleshooting

-   **"Failed to read file content"**: Refresh the GitHub page. The extension needs to inject its script after the page load.
-   **Backend Error**: Ensure the terminal running `uvicorn` is still active.
