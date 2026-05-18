import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import type { TwinTtsClipMeta } from "@/lib/api";
import { DEFAULT_TWIN_TTS_VOICE, twinDeleteTtsClip, twinListTtsClips, twinTtsSynthesize } from "@/lib/api";
import { apiUrl } from "@/lib/apiOrigin";
import { downloadBlob } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";
import { extractVoiceScriptForTts } from "@/components/creator/twinHelpers";

export const TWIN_TTS_VOICE_OPTIONS = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
  "nova",
] as const;

type TabKind = "generate" | "library";

/** Stream URL for persisted clip (handles dev proxy vs production absolute origin). */
export function twinTtsClipUrl(clipId: string) {
  return apiUrl(`/twin/tts/${encodeURIComponent(clipId)}`);
}

export function TtsPanel({
  sessionId,
  presetText,
  clearPreset,
  className,
}: {
  sessionId: string | null;
  presetText?: string | null;
  clearPreset?: () => void;
  className?: string;
}) {
  const [tab, setTab] = useState<TabKind>("generate");
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<string>(DEFAULT_TWIN_TTS_VOICE);
  const [persist, setPersist] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [clips, setClips] = useState<TwinTtsClipMeta[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!presetText?.trim()) return;
    setTab("generate");
    const forTts = extractVoiceScriptForTts(presetText);
    setText((t) => (t.trim() ? t : forTts));
    clearPreset?.();
  }, [presetText, clearPreset]);

  const revoke = useCallback(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  useEffect(() => () => revoke(), [revoke]);

  const refreshLib = useCallback(async () => {
    setLoadErr(null);
    try {
      const cls = await twinListTtsClips(sessionId ?? undefined);
      setClips(cls);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Failed to load library");
      setClips([]);
    }
  }, [sessionId]);

  useEffect(() => {
    void refreshLib();
  }, [refreshLib]);

  async function synth() {
    const raw = text.trim();
    if (!raw || busy) return;
    const t = extractVoiceScriptForTts(raw);
    if (!t) return;

    revoke();
    setBlobUrl(null);

    setBusy(true);
    try {
      const { blob } = await twinTtsSynthesize({
        text: t,
        voice,
        persist: persist && !!sessionId,
        session_id: sessionId ?? undefined,
      });
      const url = URL.createObjectURL(blob);
      setLastBlob(blob);
      setBlobUrl(url);
      await refreshLib();
    } finally {
      setBusy(false);
    }
  }

  function downloadLastMp3(blob: Blob) {
    downloadBlob(blob, `launchy-twin-tts-${voice}.mp3`);
  }

  return (
    <div className={cn("rounded-xl border border-border bg-muted/30 p-2.5", className)}>
      <span className="mb-3 block px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Voice audio
      </span>
      <div className="mb-4 flex rounded-full border bg-background p-0.5 text-[11px] font-semibold">
        <button
          type="button"
          aria-pressed={tab === "generate"}
          className={cn(
            "flex-1 rounded-full py-2 transition",
            tab === "generate" ? "bg-foreground text-background shadow" : "text-muted-foreground",
          )}
          onClick={() => setTab("generate")}
        >
          Generate
        </button>
        <button
          type="button"
          aria-pressed={tab === "library"}
          className={cn(
            "flex-1 rounded-full py-2 transition",
            tab === "library" ? "bg-foreground text-background shadow" : "text-muted-foreground",
          )}
          onClick={() => {
            setTab("library");
            void refreshLib();
          }}
        >
          Library
        </button>
      </div>

      {tab === "generate" ? (
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Text to speak"
            className="max-h-[9rem] min-h-[92px] text-[13px]"
            placeholder="Paste a reel script or Twin reply (```voice_script … ``` fences are trimmed for TTS)…"
            maxLength={4096}
            disabled={busy}
          />

          <div className="flex flex-wrap items-center gap-2">
            <label className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="twin-voice">
              Voice
            </label>
            <select
              id="twin-voice"
              className="min-w-[6rem] grow rounded-xl border bg-background px-2 py-1.5 text-[12px] font-semibold capitalize"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              aria-label="OpenAI speech voice preset"
            >
              {TWIN_TTS_VOICE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer flex-wrap items-center gap-3 text-[11px] font-medium text-muted-foreground">
            <button
              type="button"
              role="switch"
              aria-checked={persist}
              className={cn(
                "relative inline-flex h-7 w-10 shrink-0 rounded-full border",
                persist ? "border-primary bg-primary" : "border-border bg-background",
              )}
              aria-label="Save generated clip into Twin audio library"
              onClick={() => setPersist((x) => !x)}
              disabled={!sessionId || busy}
            >
              <span
                aria-hidden
                className={cn(
                  "m-px block h-[23px] w-[23px] rounded-full bg-background shadow transition-all",
                  persist && "translate-x-[15px]",
                )}
              />
            </button>
            <span>Save clip to library{sessionId ? "" : " (start a chat)"}</span>
          </label>

          <Button
            type="button"
            aria-label="Synthesize speech with OpenAI TTS"
            className="w-full"
            disabled={!text.trim() || busy}
            onClick={() => void synth()}
          >
            {busy ? "Generating…" : "Play voice"}
          </Button>

          {blobUrl ? (
            <div className="rounded-xl border border-border bg-background p-2">
              <audio controls preload="none" src={blobUrl} className="w-full rounded-lg" aria-label="Twin TTS playback preview" />
              {lastBlob ? (
                <div className="mt-3">
                  <Button
                    type="button"
                    aria-label="Download synthesized MP3"
                    variant="secondary"
                    size="sm"
                    className="w-full text-[12px]"
                    onClick={() => downloadLastMp3(lastBlob)}
                  >
                    Download MP3
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Uses OpenAI <code className="rounded bg-muted px-1 py-px">gpt-4o-mini-tts</code>. Max 4096 characters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {loadErr ? <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">{loadErr}</p> : null}
          {!clips.length ? (
            <p className="rounded-lg border bg-background px-2 py-3 text-[11px] leading-relaxed text-muted-foreground">
              Saved clips appear after you synthesize speech with Save enabled. They stay on Launchy outputs for this session folder.
            </p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-0.5">
              {clips.map((c) => (
                <li key={c.id} className="rounded-lg border bg-background px-3 py-2 shadow-sm">
                  <p className="line-clamp-2 text-[12px] text-foreground" title={c.text_preview}>
                    {c.text_preview || "(no preview)"}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {c.voice} · {(c.created_at ?? "").slice(5, 16)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <audio
                      preload="none"
                      controls
                      className="min-w-0 flex-1 rounded-md"
                      src={twinTtsClipUrl(c.id)}
                      aria-label={`Speech clip playback ${c.id.slice(0, 8)}`}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      aria-label={`Delete speech clip`}
                      title="Remove clip file"
                      className="shrink-0 px-3"
                      onClick={async () => {
                        await twinDeleteTtsClip(c.id);
                        await refreshLib();
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2 w-full text-[11px]" asChild>
                    <a href={twinTtsClipUrl(c.id)} download={`launchy-twin-${c.voice}-${c.id.slice(0, 8)}.mp3`}>
                      Download
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
