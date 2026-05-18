"""Twin chat REST + SSE endpoints."""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel, Field

from agents.twin_agent import stream_twin_turn
from agents.twin_voice_llm import suggest_twin_starters
from tools.twin_tools import TwinToolContext
from twin import tts_store
from twin.session import (
    TwinMeta,
    append_message,
    delete_session,
    first_user_preview,
    list_recent_sessions,
    read_messages,
    read_meta,
    utc_now,
    write_meta,
)
from voice.store import load_profile

router = APIRouter()

_DEFAULT_CHAT_STARTERS = [
    "What should I post this week?",
    "Rewrite this in my voice for Instagram…",
    "What's trending on Reddit in my niche?",
    "Brainstorm hooks for tomorrow's reel.",
]


class TwinSessionCreate(BaseModel):
    voice_profile_id: str | None = None


class TwinMessageCreate(BaseModel):
    content: str = Field(min_length=1)
    tool_memory: bool = True
    tool_research: bool = True
    tool_workflow: bool = True
    tool_mongodb: bool = True


class TwinSessionPatch(BaseModel):
    voice_profile_id: str | None = None


class TwinTTSBody(BaseModel):
    text: str = Field(..., max_length=4096)
    voice: str = Field(default="coral", max_length=32)
    model: str = Field(default="gpt-4o-mini-tts", max_length=48)
    instructions: str | None = Field(None, max_length=500)
    persist: bool = False
    session_id: str | None = None


def _tts_bytes_sync(*, text: str, voice: str, model: str, instructions: str | None) -> bytes:
    from openai import OpenAI

    client = OpenAI(timeout=120)
    kw: dict[str, object] = {
        "model": model,
        "voice": voice,
        "input": text,
    }
    if instructions and instructions.strip():
        kw["instructions"] = instructions.strip()

    rsp = client.audio.speech.create(**kw)  # type: ignore[arg-type]

    bio = getattr(rsp, "content", None)
    if isinstance(bio, bytes) and bio:
        return bio
    read_fn = getattr(rsp, "read", None)
    if callable(read_fn):
        out = read_fn()
        return out if isinstance(out, bytes) else bytes(out or b"")
    raise RuntimeError("OpenAI speech API returned unreadable payload")


async def _speak(payload: TwinTTSBody) -> tuple[bytes, str | None]:
    text = payload.text.strip()
    if len(text) > 4096:
        raise HTTPException(status_code=422, detail="text exceeds OpenAI speech limit")

    voice = (payload.voice or "coral").strip().lower()
    model = (payload.model or "gpt-4o-mini-tts").strip()

    bio = await asyncio.to_thread(
        lambda: _tts_bytes_sync(text=text, voice=voice, model=model, instructions=payload.instructions)
    )

    clip_id: str | None = None
    if payload.persist:
        sid = (payload.session_id or "").strip()
        if not sid:
            raise HTTPException(status_code=422, detail="session_id required when persist=true")

        entry = await asyncio.to_thread(
            lambda: tts_store.persist_mp3_bytes(
                session_id=sid,
                audio_bytes=bio,
                voice=voice,
                model=model,
                text=text,
            ),
        )
        clip_id = entry.id

    return bio, clip_id


@router.get("/suggestions")
def twin_suggestions(voice_profile_id: str | None = None) -> dict:
    """4 contextual prompts for Twin chat starters."""
    if not voice_profile_id:
        return {"suggestions": _DEFAULT_CHAT_STARTERS}
    try:
        prof = load_profile(voice_profile_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="voice profile not found") from None
    try:
        out = suggest_twin_starters(prof)
    except Exception:  # noqa: BLE001
        out = []
    merged: list[str] = []
    for s in list(out) + list(_DEFAULT_CHAT_STARTERS):
        t = str(s).strip()
        if t and t not in merged:
            merged.append(t)
        if len(merged) >= 4:
            break
    return {"suggestions": merged[:4]}


@router.post("/sessions")
def create_session(body: TwinSessionCreate) -> dict:
    sid = str(uuid.uuid4())
    now = utc_now()
    meta = TwinMeta(
        session_id=sid,
        voice_profile_id=body.voice_profile_id,
        created_at=now,
        updated_at=now,
    )
    write_meta(meta)
    return {"session_id": sid, **body.model_dump()}


@router.get("/sessions")
def list_sessions(
    limit: int = 40,
    include_preview: bool = Query(default=True),
) -> list[dict]:
    metas = list_recent_sessions(limit=limit)
    out: list[dict] = []
    for m in metas:
        row: dict = {
            "session_id": m.session_id,
            "voice_profile_id": m.voice_profile_id,
            "created_at": m.created_at,
            "updated_at": m.updated_at,
        }
        if include_preview:
            prev = first_user_preview(m.session_id)
            row["preview"] = prev or ""
        out.append(row)
    return out


@router.get("/sessions/{session_id}")
def get_session(session_id: str) -> dict:
    meta = read_meta(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail="session not found")
    return {
        "meta": {
            "session_id": meta.session_id,
            "voice_profile_id": meta.voice_profile_id,
            "created_at": meta.created_at,
            "updated_at": meta.updated_at,
        },
        "messages": read_messages(session_id, max_turns=500),
    }


@router.patch("/sessions/{session_id}")
def patch_session(session_id: str, body: TwinSessionPatch) -> dict:
    meta = read_meta(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail="session not found")
    data = body.model_dump(exclude_unset=True)
    if "voice_profile_id" not in data:
        return {"ok": True, "voice_profile_id": meta.voice_profile_id}
    meta = TwinMeta(
        session_id=meta.session_id,
        voice_profile_id=data["voice_profile_id"],
        created_at=meta.created_at,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    write_meta(meta)
    return {"ok": True, "voice_profile_id": meta.voice_profile_id}


@router.delete("/sessions/{session_id}")
def remove_session(session_id: str) -> dict:
    if not delete_session(session_id):
        raise HTTPException(status_code=404, detail="session not found")
    return {"ok": True}


@router.post("/sessions/{session_id}/messages")
async def post_message_sse(session_id: str, body: TwinMessageCreate) -> StreamingResponse:
    meta = read_meta(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail="session not found")

    append_message(session_id, {"role": "user", "content": body.content.strip()})

    refreshed = TwinMeta(
        session_id=meta.session_id,
        voice_profile_id=meta.voice_profile_id,
        created_at=meta.created_at,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    write_meta(refreshed)

    tctx = TwinToolContext(
        voice_profile_id=meta.voice_profile_id,
        tool_memory=body.tool_memory,
        tool_research=body.tool_research,
        tool_workflow=body.tool_workflow,
        tool_mongodb=body.tool_mongodb,
    )

    async def event_gen():
        async for ev in stream_twin_turn(session_id=session_id, twin_ctx=tctx):
            yield f"data: {json.dumps(ev, default=str)}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")


@router.post("/tts")
async def twin_tts_generate(body: TwinTTSBody) -> Response:
    bio, clip_id = await _speak(body)

    fname = datetime.now(timezone.utc).strftime("twin-%Y%m%d_%H%M%S.mp3")
    hdrs: dict[str, str] = {
        "Content-Disposition": f'attachment; filename="{fname}"',
    }
    if clip_id:
        hdrs["X-TTS-Clip-Id"] = clip_id

    return Response(content=bio, media_type="audio/mpeg", headers=hdrs)


@router.get("/tts")
def twin_tts_list(session_id: str | None = None, limit: int = 80) -> dict:
    """Latest persisted TTS clips (optionally scoped to twin session folder)."""
    rows = tts_store.list_entries(session_id=session_id or None, limit=max(1, min(limit, 200)))
    return {"clips": [r.to_dict() for r in rows]}


@router.get("/tts/{clip_id}")
def twin_tts_download(clip_id: str):
    """Stream or download persisted MP3 blob."""
    ent = tts_store.get_entry(clip_id)
    if ent is None:
        raise HTTPException(status_code=404, detail="clip not found")
    fp = tts_store.resolve_audio_file(ent)
    if fp is None or not fp.exists():
        raise HTTPException(status_code=404, detail="audio file missing on disk")

    dl_name = (
        ent.text_preview.strip()[:42].replace("/", "-") + ".mp3" if ent.text_preview else None
    ) or f"twin-{ent.voice}-{clip_id}.mp3"
    hdrs = {"Content-Disposition": f'attachment; filename="{dl_name}"'}

    return FileResponse(path=str(fp.resolve()), media_type="audio/mpeg", headers=hdrs)


@router.delete("/tts/{clip_id}")
def twin_tts_delete(clip_id: str) -> dict:
    ok = tts_store.delete_entry(clip_id)
    return {"ok": ok}
