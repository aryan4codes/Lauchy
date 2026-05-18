"""Persistent TTS clip index + blobs under outputs/twin_tts."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import uuid


ROOT = Path("outputs") / "twin_tts"


def ensure_root() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)


def _sanitize_session_id(session_id: str) -> str:
    return re.sub(r"[^a-zA-Z0-9\-_.]", "_", session_id)[:96]


def _index_path() -> Path:
    return ROOT / "index.jsonl"


@dataclass
class TtsEntry:
    id: str
    session_id: str
    voice: str
    model: str
    text_preview: str
    created_at: str
    path: str  # relative to repo root outputs/twin_tts/...

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "voice": self.voice,
            "model": self.model,
            "text_preview": self.text_preview,
            "created_at": self.created_at,
            "path": self.path,
        }


def _abs_path(rel: str) -> Path:
    return Path(rel)


def persist_mp3_bytes(
    *,
    session_id: str,
    audio_bytes: bytes,
    voice: str,
    model: str,
    text: str,
) -> TtsEntry:
    """Write MP3 to disk and append index row."""
    ensure_root()
    sid = _sanitize_session_id(session_id or "no_session")
    folder = ROOT / sid
    folder.mkdir(parents=True, exist_ok=True)
    short = uuid.uuid4().hex
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    fname = f"{stamp}_{short[:8]}.mp3"
    out_path = folder / fname
    out_path.write_bytes(audio_bytes)
    cwd = Path.cwd().resolve()
    try:
        path_str = str(out_path.resolve().relative_to(cwd))
    except ValueError:
        path_str = str(out_path.resolve())
    preview = text.replace("\n", " ").strip()
    preview = preview[:180] + ("…" if len(preview) > 180 else "")

    ent = TtsEntry(
        id=short,
        session_id=sid,
        voice=voice,
        model=model,
        text_preview=preview,
        created_at=datetime.now(timezone.utc).isoformat(),
        path=path_str,
    )
    with _index_path().open("a", encoding="utf-8") as f:
        f.write(json.dumps(ent.to_dict(), ensure_ascii=False) + "\n")
    return ent


def list_entries(*, session_id: str | None = None, limit: int = 80) -> list[TtsEntry]:
    p = _index_path()
    if not p.exists():
        return []
    rows: list[TtsEntry] = []
    for line in reversed(p.read_text(encoding="utf-8").splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        try:
            e = TtsEntry(
                id=d["id"],
                session_id=d["session_id"],
                voice=d.get("voice", "coral"),
                model=d.get("model", ""),
                text_preview=d.get("text_preview", ""),
                created_at=d.get("created_at", ""),
                path=d["path"],
            )
        except KeyError:
            continue
        if session_id and e.session_id != _sanitize_session_id(session_id):
            continue
        rows.append(e)
        if len(rows) >= limit:
            break
    return rows


def get_entry(tts_id_prefix: str) -> TtsEntry | None:
    """Match by trailing id substring (stored id combines short hex + stamp)."""
    p = _index_path()
    if not p.exists():
        return None
    for line in reversed(p.read_text(encoding="utf-8").splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        hid = str(d.get("id", ""))
        if hid == tts_id_prefix or hid.endswith(tts_id_prefix) or hid.startswith(tts_id_prefix):
            return TtsEntry(
                id=hid,
                session_id=d.get("session_id", ""),
                voice=d.get("voice", "coral"),
                model=d.get("model", ""),
                text_preview=d.get("text_preview", ""),
                created_at=d.get("created_at", ""),
                path=d.get("path", ""),
            )
    return None


def resolve_audio_file(entry: TtsEntry) -> Path | None:
    path = Path(entry.path)
    if path.is_absolute() and path.exists():
        return path
    p2 = Path.cwd() / entry.path  # noqa: B008 project cwd
    if p2.exists():
        return p2
    return path if path.exists() else None


def delete_entry(tts_id: str) -> bool:
    """Remove clip file and drop its index line."""
    entry = get_entry(tts_id)
    if entry is None:
        return False
    af = resolve_audio_file(entry)
    if af and af.exists():
        try:
            af.unlink()
        except OSError:
            pass
    p = _index_path()
    if not p.exists():
        return False
    lines_kept = []
    removed = False
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            lines_kept.append(line)
            continue
        hid = str(d.get("id", ""))
        if hid == entry.id:
            removed = True
            continue
        lines_kept.append(line)
    p.write_text("\n".join(lines_kept) + ("\n" if lines_kept else ""), encoding="utf-8")
    return removed
