"""Small OpenAI helpers for twin-related voice enrichment (categories, chat starters)."""

from __future__ import annotations

import json
import os
from typing import Any

from openai import OpenAI

from voice.schema import VoiceProfile


def _model() -> str:
    return os.environ.get("TWIN_VOICE_LLM_MODEL", os.environ.get("OPENAI_MODEL", "gpt-4.1-nano"))


def _client() -> OpenAI:
    return OpenAI()


def _chat_json_object(system: str, user: str, expect_keys: tuple[str, ...]) -> dict[str, Any]:
    completion = _client().chat.completions.create(
        model=_model(),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.5,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content or "{}"
    obj = json.loads(raw)
    if not isinstance(obj, dict):
        return {}
    for k in expect_keys:
        if k not in obj:
            return {}
    return obj


def infer_content_categories(
    voice: VoiceProfile,
    *,
    training_samples_concat: str | None = None,
) -> list[str]:
    """Derive 2–5 niche tags from saved profile signals (used for recategorize + profiler fallback)."""
    bits: list[str] = [
        f"Creator name: {voice.creator_name}",
        f"Tones: {', '.join(voice.tone_descriptors)}",
        f"Vocabulary hints: {', '.join(voice.vocabulary_signature[:15])}",
        f"Hooks: {' | '.join(voice.example_hooks[:5])}",
        f"Summary: {voice.summary_block}",
        f"Sentence style: {voice.sentence_style[:800]}",
    ]
    caps: list[str] = []
    for t in voice.transcriptions[:6]:
        if t.transcript.strip():
            caps.append(f"SPOKEN: {t.transcript[:320]}…")
        if t.caption.strip():
            caps.append(f"Caption: {t.caption[:200]}")
    if caps:
        bits.append("Samples:\n" + "\n".join(caps))
    if training_samples_concat and training_samples_concat.strip():
        bits.append(f"RAW_TRAINING_DUMP:\n{training_samples_concat.strip()[:12000]}")
    blob = "\n\n".join(bits)

    payload = _chat_json_object(
        system=(
            "You label creator content genres for a marketing twin. Infer 2–5 short niche tags "
            '(each max 4 words). Return ONLY JSON object: {"content_categories":["tag1","tag2"]}. '
            "Tags describe what they actually publish — concrete phrases only."
        ),
        user=blob,
        expect_keys=("content_categories",),
    )
    cats = payload.get("content_categories") if isinstance(payload, dict) else None
    if not isinstance(cats, list):
        return []
    cleaned: list[str] = []
    for c in cats:
        if isinstance(c, str):
            words = " ".join(c.strip().split()).split()
            if words:
                cleaned.append(" ".join(words[:4]))
    return cleaned[:5]


def suggest_twin_starters(voice: VoiceProfile) -> list[str]:
    """Return 4 short chat prompts tailored to this voice + niche."""
    blob = json.dumps(
        {
            "creator_name": voice.creator_name,
            "content_categories": voice.content_categories or infer_content_categories(voice),
            "tone_descriptors": voice.tone_descriptors[:8],
            "example_hooks": voice.example_hooks[:5],
            "summary_block": voice.summary_block[:900],
        },
        ensure_ascii=False,
    )

    payload = _chat_json_object(
        system=(
            "Generate exactly 4 actionable Digital Twin chat prompts. "
            "Each <=140 chars; grounded in niche + voice. Mix hooks, reels ideas, drafts. "
            'Return ONLY JSON: {"suggestions":["...","...","...","..."]}'
        ),
        user=blob,
        expect_keys=("suggestions",),
    )
    sug = payload.get("suggestions") if isinstance(payload, dict) else None
    if not isinstance(sug, list):
        return []
    out: list[str] = []
    for s in sug:
        if isinstance(s, str) and s.strip():
            out.append(s.strip()[:280])
        if len(out) >= 4:
            break
    return out[:4] if len(out) >= 4 else out

