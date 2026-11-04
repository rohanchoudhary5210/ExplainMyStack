from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from dotenv import load_dotenv

load_dotenv()  # reads backend/.env before the service looks for OPENAI_API_KEY

from app.llm_service import LLMError, explain_file  # noqa: E402

MAX_CODE_CHARS = 60_000  # keeps prompts inside the model's context window

app = FastAPI(title="ExplainMyStack API")

# Only the Chrome extension (and local tools) may call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(chrome-extension://.*|http://(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


class FileExplanationRequest(BaseModel):
    repo_name: str = Field(min_length=3, max_length=200, pattern=r"^[\w.-]+/[\w.-]+$")
    file_path: str = Field(min_length=1, max_length=500)
    code_content: str = Field(min_length=1, max_length=MAX_CODE_CHARS)


class FileExplanationResponse(BaseModel):
    explanation: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/explain-file", response_model=FileExplanationResponse)
def explain(req: FileExplanationRequest):
    if not req.code_content.strip():
        raise HTTPException(status_code=422, detail="code_content is empty")
    try:
        text = explain_file(req.repo_name, req.file_path, req.code_content)
    except LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return FileExplanationResponse(explanation=text)
