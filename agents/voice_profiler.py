"""CrewAI profiler: samples -> VoiceProfilerLLMOutput."""

from __future__ import annotations

import os

from crewai import Agent, Crew, Process, Task

from agents.twin_voice_llm import infer_content_categories as _infer_content_categories_fallback
from voice.schema import VoiceProfilerLLMOutput, VoiceProfile


def run_voice_profiler(*, creator_name: str, sample_texts: list[str]) -> VoiceProfilerLLMOutput:
    """Single-agent extraction of voice characteristics from raw sample strings."""
    os.environ.setdefault("OPENAI_MODEL", "gpt-4.1-nano")
    # Use a stronger model for voice profiling — quality matters here
    model = os.environ.get("VOICE_PROFILER_MODEL", "gpt-4.1-nano")

    joined = "\n\n---SAMPLE_BREAK---\n\n".join(sample_texts) if sample_texts else "(no samples)"
    desc = f"""Creator name supplied by user: {creator_name}

Training samples (may include posts, scraped pages, Reddit submissions, or Instagram reel captions plus
SPOKEN_TRANSCRIPT lines). Blocks are separated by SAMPLE_BREAK:

{joined}

=== TASK ===
Extract THIS specific creator's unique voice fingerprint. Be creator-specific — avoid generic marketing advice.
Every field must be grounded in actual patterns you observe in the samples above.

FIELD REQUIREMENTS:

1. tone_descriptors (6-10 short adjectives):
   - Only adjectives that are SPECIFIC to this creator — not generic words like "professional" or "helpful"
   - Examples of specific: "mock-serious", "breathless-curious", "dry-wit", "over-explainer", "hype-builder"

2. vocabulary_signature (10-20 words/phrases):
   - Words or phrases that appear REPEATEDLY or are CHARACTERISTIC in these samples
   - Quote them directly from the text when possible (e.g., "So basically", "right?", "you know", creator-specific terms)

3. sentence_style (1-2 concrete paragraphs):
   - Note actual sentence-starting patterns (does this creator start with "And", "But", "So", "Look", "Here's the thing"?)
   - Comment on average sentence length, rhythm, use of questions, line breaks as pauses
   - Mention punctuation habits (ellipses, dashes, exclamation marks, capitalization for emphasis)

4. do_list (5-8 rules):
   - Each rule must be CONCRETE and derived from observed patterns
   - BAD: "Use a conversational tone" — GOOD: "Start sentences mid-thought with 'So', 'And', or 'But' to create momentum"
   - Reference actual sample patterns wherever possible

5. dont_list (5-8 rules):
   - What this creator NEVER does or actively avoids (infer from absence or contrast)
   - BAD: "Don't be formal" — GOOD: "Never write multi-clause sentences — this creator always breaks them into 2-3 word punches"

6. example_hooks (5-8 lines):
   - REAL opening lines or hooks directly from the samples (quote or closely paraphrase)
   - These must be derived from actual content, not invented

7. delivery_style:
   - ONLY if SPOKEN_TRANSCRIPT lines exist and have real speech content
   - Name specific fillers used (e.g., "uses 'you know' every 3-4 sentences", "starts thoughts with 'So basically'")
   - Describe energy arc: does this creator build up or stay flat? Do they trail off or cut sharp?
   - Note speaking pace cues visible in transcript (many short sentences = fast pace, long run-ons = stream of consciousness)
   - Empty string if no usable spoken audio in samples

8. summary_block (3-4 sentences, compact, imperative):
   - Paste-ready prompt fragment: "VOICE PROFILE — [Name]: [2-3 tone words]. Vocabulary: [5-6 signature words/phrases].
     Sentences: [style pattern]. [Delivery if audio]. DO: [top 3 rules]. DON'T: [top 3 rules]. Example: '[hook]'."
   - Make it dense and specific — a copywriter should be able to match this voice from the summary alone

9. content_categories (2–5 SHORT genre labels — maximum ~4 words per label):
   - Infer concrete topical niches directly from captions, transcripts, Reddit posts, scraped pages — NEVER pick from an approved list.
   - Think "what audiences would say they follow this creator FOR": e.g. "open-source LLM infra", "vintage Rolex repair",
     "college robotics projects", NOT vague buckets ("Tech", "Funny").
   - Every label must cite evidence implicitly present in Samples (overlap with hooks/vocabulary/topics).
"""


    agent = Agent(
        role="Voice profiler",
        goal=(
            "Produce a hyper-specific, creator-unique voice style guide. "
            "Every observation must be traceable to the provided samples."
        ),
        backstory=(
            "You are a professional voice analyst who studies transcripts and writing to extract "
            "the exact fingerprint of a specific creator's communication style. "
            "You never produce generic advice — every rule you write has a concrete example from the material."
        ),
        tools=[],
        llm=model,
        verbose=False,
    )

    task = Task(
        description=desc,
        expected_output=(
            "Structured VoiceProfilerLLMOutput — every field specific, evidence-based, and non-generic; "
            "include 2–5 content_categories niche labels; summary_block is compact and imperative."
        ),
        agent=agent,
        output_pydantic=VoiceProfilerLLMOutput,
    )
    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    result = crew.kickoff(inputs={})
    jd = getattr(result, "json_dict", None)
    pyd = getattr(result, "pydantic", None)
    parsed: VoiceProfilerLLMOutput | None = None

    if jd:
        parsed = VoiceProfilerLLMOutput.model_validate(jd)
        if creator_name.strip():
            parsed = parsed.model_copy(update={"creator_name": creator_name.strip()})
    elif pyd is not None:
        data = pyd.model_dump() if hasattr(pyd, "model_dump") else pyd
        parsed = VoiceProfilerLLMOutput.model_validate(data)
        if creator_name.strip():
            parsed = parsed.model_copy(update={"creator_name": creator_name.strip()})

    if parsed is None:
        raise ValueError(f"Voice profiler produced no structured output: {getattr(result, 'raw', result)!r}")

    if len([c for c in parsed.content_categories if c.strip()]) < 2:
        tmp = VoiceProfile(
            profile_id="__infer__",
            created_at="__infer__",
            updated_at="__infer__",
            sample_count=len(sample_texts),
            creator_name=parsed.creator_name,
            tone_descriptors=parsed.tone_descriptors,
            vocabulary_signature=parsed.vocabulary_signature,
            sentence_style=parsed.sentence_style,
            do_list=parsed.do_list,
            dont_list=parsed.dont_list,
            example_hooks=parsed.example_hooks,
            delivery_style=parsed.delivery_style,
            summary_block=parsed.summary_block,
            content_categories=list(parsed.content_categories),
            transcriptions=[],
        )
        cats = _infer_content_categories_fallback(tmp, training_samples_concat=joined)
        parsed = parsed.model_copy(update={"content_categories": cats})

    return parsed
