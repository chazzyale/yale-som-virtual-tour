"""FastAPI backend for Yale SOM Virtual: chat with the professors, each one a PydanticAI agent.

Run from the repo root:
    backend/.venv/Scripts/python -m uvicorn main:app --app-dir backend --port 8001 --reload
"""

import logging
import os
from collections import OrderedDict
from pathlib import Path

from dotenv import load_dotenv

# backend/.env wins, then the repo's .env, then one in the folder above the repo
HERE = Path(__file__).resolve().parent
for env in (HERE / ".env", HERE.parent / ".env", HERE.parent.parent / ".env"):
    load_dotenv(env)
os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402
from pydantic_ai import UsageLimits  # noqa: E402
from pydantic_ai.messages import ModelMessage  # noqa: E402

import professors  # noqa: E402

log = logging.getLogger("uvicorn.error")
app = FastAPI(title="Yale SOM Virtual API")

# Vite dev servers; production can set ALLOWED_ORIGINS (comma-separated)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_SESSIONS = 500
HISTORY: OrderedDict[tuple[str, str], list[ModelMessage]] = OrderedDict()


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str = Field(min_length=1, max_length=100)


class ChatOut(BaseModel):
    reply: str


def _known(prof_id: str) -> None:
    if prof_id not in professors.roster():
        raise HTTPException(404, f"No professor with id '{prof_id}'")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "model": os.getenv("OPENAI_MODEL", professors.DEFAULT_MODEL), "key_loaded": bool(os.getenv("PORTKEY_API_KEY"))}


@app.get("/api/professors")
def list_professors() -> list[dict]:
    return [professors.public_info(pid) for pid in professors.roster()]


@app.get("/api/professors/{prof_id}")
def get_professor(prof_id: str) -> dict:
    _known(prof_id)
    return professors.public_info(prof_id)


@app.post("/api/professors/{prof_id}/chat")
async def chat(prof_id: str, body: ChatIn) -> ChatOut:
    _known(prof_id)
    key = (prof_id, body.session_id)
    history = HISTORY.get(key, [])
    try:
        result = await professors.get_agent(prof_id).run(
            body.message, message_history=history, usage_limits=UsageLimits(request_limit=8)
        )
    except Exception as exc:  # model/gateway errors: log the type, never the key
        log.error("chat failed for %s: %s: %s", prof_id, type(exc).__name__, str(exc)[:300])
        raise HTTPException(502, "The professor couldn't answer right now. Try again in a moment.") from exc
    HISTORY[key] = result.all_messages()
    HISTORY.move_to_end(key)
    while len(HISTORY) > MAX_SESSIONS:
        HISTORY.popitem(last=False)
    return ChatOut(reply=result.output)


@app.delete("/api/professors/{prof_id}/chat/{session_id}")
def reset_chat(prof_id: str, session_id: str) -> dict:
    HISTORY.pop((prof_id, session_id), None)
    return {"ok": True}
