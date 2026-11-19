"""API for the local ExplainMyStack extension and bounded repository Q&A."""
import hmac
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()
from app.llm_service import LLMError, explain_file, answer_repository  # noqa: E402
from app.repository_service import collect_context  # noqa: E402

MAX_CODE_CHARS = 60_000
REPO_PATTERN = r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$"
app = FastAPI(title="ExplainMyStack API")
# CORS is NOT an authentication mechanism. Public deployments require an API token.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(chrome-extension://[a-p]{32}|http://(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "X-API-Token"],
)


def require_api_token(x_api_token: str | None = Header(default=None)):
    expected = os.getenv("EXPLAINMYSTACK_API_TOKEN", "").strip()
    if expected and (not x_api_token or not hmac.compare_digest(x_api_token, expected)):
        raise HTTPException(status_code=401, detail="Invalid or missing API token")


class FileExplanationRequest(BaseModel):
    repo_name: str = Field(min_length=3, max_length=200, pattern=REPO_PATTERN)
    file_path: str = Field(min_length=1, max_length=500)
    code_content: str = Field(min_length=1, max_length=MAX_CODE_CHARS)


class RepositoryQuestion(BaseModel):
    repo_name: str = Field(min_length=3, max_length=200, pattern=REPO_PATTERN)
    question: str = Field(min_length=5, max_length=1000)


class FileExplanationResponse(BaseModel):
    explanation: str


class RepositoryAnswer(BaseModel):
    explanation: str
    analyzed_files: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/explain-file", response_model=FileExplanationResponse, dependencies=[Depends(require_api_token)])
def explain(req: FileExplanationRequest):
    if not req.code_content.strip():
        raise HTTPException(status_code=422, detail="code_content is empty")
    try:
        text = explain_file(req.repo_name, req.file_path, req.code_content)
    except LLMError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return FileExplanationResponse(explanation=text)


@app.post("/ask-repository", response_model=RepositoryAnswer, dependencies=[Depends(require_api_token)])
def ask_repository(req: RepositoryQuestion):
    try:
        context, files = collect_context(req.repo_name, req.question)
        explanation = answer_repository(req.repo_name, req.question, context, files)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except LLMError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return RepositoryAnswer(explanation=explanation, analyzed_files=files)
