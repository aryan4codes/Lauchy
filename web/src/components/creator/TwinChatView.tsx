import { Lightbulb, MessageCircle, Rocket } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  assistantBridgingForIndex,
  extractVoiceScriptForTts,
  randomTwinRowId,
  rowsFromStored,
  uiTurnsToExportTurns,
  type UiTurn,
} from "@/components/creator/twinHelpers";

import { ActionRunCard } from "@/components/twin/ActionRunCard";
import { Composer } from "@/components/twin/Composer";
import { ContextRail } from "@/components/twin/ContextRail";
import { MessageBubble } from "@/components/twin/MessageBubble";
import { SessionExportMenu } from "@/components/twin/SessionExportMenu";
import type { TwinSessionRow } from "@/components/twin/SessionRail";
import { SessionRail } from "@/components/twin/SessionRail";
import { ToolRow } from "@/components/twin/ToolRow";
import { TypingDots } from "@/components/twin/TypingDots";

import { Button } from "@/components/ui/button";

import {
  listVoiceProfiles,
  recategorizeVoiceProfile,
  twinCreateSession,
  twinFetchSuggestions,
  twinGetSession,
  twinListSessions,
  twinPatchSession,
  type VoiceProfile,
} from "@/lib/api";

import type { ExportTurn, SessionMetaLite } from "@/lib/exportUtils";

import { streamTwinMessage, type TwinSseEvent } from "@/lib/twinClient";

const LS_SESSION = "launchy_twin_session_id";
const LS_VOICE = "launchy_active_voice_profile";

const FALLBACK_STARTERS = [
  "What should I post this week?",
  "Rewrite this in my voice for Instagram…",
  "What's trending on Reddit in my niche?",
  "Brainstorm hooks for tomorrow's reel.",
];

export function TwinChatView() {
  const [, setSearchParams] = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(LS_SESSION) : null,
  );
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(LS_VOICE) : null,
  );
  const [sessions, setSessions] = useState<TwinSessionRow[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionMetaLite | null>(null);

  const [rows, setRows] = useState<UiTurn[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [toolMemory, setToolMemory] = useState(true);
  const [toolResearch, setToolResearch] = useState(true);
  const [toolWorkflow, setToolWorkflow] = useState(true);
  const [toolMongodb, setToolMongodb] = useState(true);
  const [starters, setStarters] = useState<string[]>(FALLBACK_STARTERS);
  const [ttsSeed, setTtsSeed] = useState<string | null>(null);
  const [recBusy, setRecBusy] = useState(false);

  const activeProfile = useMemo(
    () => (activeVoiceId ? voices.find((v) => v.profile_id === activeVoiceId) ?? null : null),
    [voices, activeVoiceId],
  );

  const refreshVoices = useCallback(async () => {
    try {
      setVoices(await listVoiceProfiles());
    } catch {
      setVoices([]);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await twinListSessions());
    } catch {
      setSessions([]);
    }
  }, []);

  const loadSessionRemote = useCallback(async (sid: string) => {
    const data = await twinGetSession(sid);
    setRows(rowsFromStored(data.messages ?? []));
    const meta = (data.meta ?? {}) as Record<string, string | null | undefined>;
    setSessionMeta({
      session_id: typeof meta.session_id === "string" ? meta.session_id : sid,
      voice_profile_id: typeof meta.voice_profile_id === "string" ? meta.voice_profile_id : null,
      created_at: typeof meta.created_at === "string" ? meta.created_at : undefined,
      updated_at: typeof meta.updated_at === "string" ? meta.updated_at : undefined,
    });
  }, []);

  useEffect(() => {
    void refreshVoices();
    void refreshSessions();
  }, [refreshVoices, refreshSessions]);

  useEffect(() => {
    if (!sessionId) return;
    void loadSessionRemote(sessionId).catch(() => {
      setRows([]);
      setSessionMeta(null);
    });
  }, [sessionId, loadSessionRemote]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { suggestions } = await twinFetchSuggestions(activeVoiceId);
        if (!alive) return;
        setStarters(suggestions?.length ? suggestions.slice(0, 4) : FALLBACK_STARTERS);
      } catch {
        if (alive) setStarters(FALLBACK_STARTERS);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeVoiceId]);

  useEffect(() => {
    setSessionMeta((prev) => {
      if (!prev || !prev.session_id) return prev;
      return {
        ...prev,
        voice_creator_name: activeProfile?.creator_name ?? null,
        content_categories: activeProfile?.content_categories ?? [],
      };
    });
  }, [sessionId, activeProfile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [rows, busy]);

  const exportRows: ExportTurn[] = useMemo(() => uiTurnsToExportTurns(rows), [rows]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const { session_id } = await twinCreateSession({ voice_profile_id: activeVoiceId });
    localStorage.setItem(LS_SESSION, session_id);
    setSessionId(session_id);
    await refreshSessions();
    return session_id;
  };

  const onNewChat = async () => {
    const { session_id } = await twinCreateSession({ voice_profile_id: activeVoiceId });
    localStorage.setItem(LS_SESSION, session_id);
    setSessionId(session_id);
    setRows([]);
    setSessionMeta(null);
    await refreshSessions();
  };

  const onSend = async () => {
    const text = composer.trim();
    if (!text || busy) return;
    setComposer("");
    setBusy(true);
    const sid = await ensureSession();

    const userId = randomTwinRowId();
    setRows((r) => [...r, { id: userId, kind: "user", content: text }]);

    const assistantId = randomTwinRowId();
    setRows((r) => [...r, { id: assistantId, kind: "assistant", content: "", streaming: true }]);

    const applyToken = (delta: string) => {
      setRows((r) =>
        r.map((row) =>
          row.id === assistantId && row.kind === "assistant"
            ? { ...row, content: row.content + delta }
            : row,
        ),
      );
    };

    try {
      await streamTwinMessage(
        sid,
        {
          content: text,
          tool_memory: toolMemory,
          tool_research: toolResearch,
          tool_workflow: toolWorkflow,
          tool_mongodb: toolMongodb,
        },
        (ev: TwinSseEvent) => {
          if (ev.type === "token") applyToken(ev.delta);
          else if (ev.type === "tool_result")
            setRows((r) => [...r, { id: randomTwinRowId(), kind: "tool", name: ev.name, summary: ev.summary }]);
          else if (ev.type === "action" && ev.kind === "workflow_run_started")
            setRows((r) => [
              ...r,
              {
                id: randomTwinRowId(),
                kind: "action",
                runId: ev.run_id,
                resultsUrl: ev.results_url,
                templateId: ev.template_id,
              },
            ]);
          else if (ev.type === "error") applyToken(`\n\n[error] ${ev.message}`);
        },
      );
    } catch (e) {
      applyToken(`\n\n${e instanceof Error ? e.message : "Request failed"}`);
    } finally {
      setBusy(false);
      setRows((r) =>
        r.map((row) =>
          row.id === assistantId && row.kind === "assistant" ? { ...row, streaming: false } : row,
        ),
      );
      void refreshSessions();
    }
  };

  const switchVoiceForSession = async (vid: string | null) => {
    setActiveVoiceId(vid);
    if (vid) localStorage.setItem(LS_VOICE, vid);
    else localStorage.removeItem(LS_VOICE);
    if (sessionId) await twinPatchSession(sessionId, { voice_profile_id: vid });
  };

  const onRecategorize = async () => {
    if (!activeVoiceId) return;
    setRecBusy(true);
    try {
      await recategorizeVoiceProfile(activeVoiceId);
      await refreshVoices();
    } finally {
      setRecBusy(false);
    }
  };

  const greeting = activeProfile?.creator_name?.trim()?.length
    ? `Hey ${activeProfile.creator_name.split(" ")[0]} — what are we making?`
    : "Hey — what are we making?";

  const starterIcon = (i: number) =>
    i % 3 === 0 ? <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden /> : i % 3 === 1 ? <Rocket className="h-4 w-4 text-violet-500" aria-hidden /> : <MessageCircle className="h-4 w-4 text-sky-500" aria-hidden />;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 gap-3 md:gap-4">
      <SessionRail
        tab="chat"
        onTabTrain={() => setSearchParams({ tab: "train" }, { replace: true })}
        onTabChat={() => setSearchParams({}, { replace: true })}
        sessions={sessions}
        sessionId={sessionId}
        onSelectSession={(sid) => {
          localStorage.setItem(LS_SESSION, sid);
          setSessionId(sid);
        }}
        onNewChat={() => void onNewChat()}
        voices={voices}
        activeVoiceId={activeVoiceId}
        onVoicePick={(v) => void switchVoiceForSession(v)}
        busy={busy}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card/80 shadow-xl backdrop-blur-lg dark:bg-card/60">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 text-white shadow">
              <MessageCircle className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Twin chat</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {activeProfile ? activeProfile.creator_name : "Pick a voice for on-brand answers"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SessionExportMenu rows={exportRows} meta={sessionMeta} creatorSlug={activeProfile?.creator_name} disabled={exportRows.length === 0} />
            <Button type="button" variant="outline" size="sm" aria-label="Start new chat" disabled={busy} onClick={() => void onNewChat()}>
              New chat
            </Button>
          </div>
        </header>

        {activeProfile?.content_categories?.length ? (
          <div className="flex flex-wrap gap-1.5 border-b border-border bg-muted/20 px-4 py-2 md:px-5">
            {activeProfile.content_categories.map((c) => (
              <span
                key={c}
                className="rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        ) : null}

        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-gradient-to-b from-muted/15 to-background px-3 py-4 md:px-6"
        >
          {rows.length === 0 && !busy ? (
            <div className="mx-auto flex max-w-xl flex-col gap-6 py-6 text-center">
              <div>
                <p className="text-balance text-lg font-semibold tracking-tight text-foreground md:text-xl">{greeting}</p>
                {!activeVoiceId ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Select a voice in the left rail (or{" "}
                    <Link className="font-medium underline underline-offset-2" to="/twin?tab=train">
                      train one
                    </Link>
                    ) so Twin matches your tone.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2 text-left">
                <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ideas</p>
                {starters.map((s, i) => (
                  <button
                    key={`${i}-${s.slice(0, 24)}`}
                    type="button"
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm shadow-sm transition hover:border-primary/40 hover:bg-muted/40"
                    onClick={() => setComposer(s)}
                  >
                    <span className="mt-0.5 shrink-0">{starterIcon(i)}</span>
                    <span className="leading-snug text-foreground">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {rows.map((row, idx) => {
              if (row.kind === "user")
                return <MessageBubble key={row.id} role="user" content={row.content} showTwinLabel={false} />;
              if (row.kind === "assistant") {
                const live = row.streaming && row.content === "" && busy;
                const pack =
                  row.content.trim().length && !row.streaming
                    ? (() => {
                        const { precedingUser, bridging } = assistantBridgingForIndex(rows, idx);
                        return {
                          precedingUser,
                          bridging,
                          creatorSlug: activeProfile?.creator_name ?? null,
                        };
                      })()
                    : null;
                return (
                  <div key={row.id} className="space-y-2">
                    {live ? (
                      <div className="flex items-center gap-2 pl-12 text-muted-foreground" aria-label="Twin is thinking">
                        <TypingDots />
                        <span className="text-[12px]">Thinking…</span>
                      </div>
                    ) : null}
                    {row.content.trim().length ? (
                      <MessageBubble
                        role="twin"
                        content={row.content}
                        showTwinLabel={(idx > 0 ? rows[idx - 1]?.kind : undefined) !== "assistant"}
                        assistantExportPack={pack}
                        onHearTwin={() => {
                          setTtsSeed(extractVoiceScriptForTts(row.content));
                        }}
                      />
                    ) : null}
                  </div>
                );
              }
              if (row.kind === "tool") return <ToolRow key={row.id} name={row.name} summary={row.summary} />;
              if (row.kind === "action")
                return <ActionRunCard key={row.id} runId={row.runId} resultsUrl={row.resultsUrl} templateId={row.templateId} />;
              return null;
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 border-t border-border bg-muted/25 px-3 py-2 xl:hidden">
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <input type="checkbox" className="accent-foreground" checked={toolMemory} onChange={(e) => setToolMemory(e.target.checked)} />
            Memory
          </label>
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <input type="checkbox" className="accent-foreground" checked={toolResearch} onChange={(e) => setToolResearch(e.target.checked)} />
            Research
          </label>
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <input type="checkbox" className="accent-foreground" checked={toolWorkflow} onChange={(e) => setToolWorkflow(e.target.checked)} />
            Workflows
          </label>
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <input type="checkbox" className="accent-foreground" checked={toolMongodb} onChange={(e) => setToolMongodb(e.target.checked)} />
            Voice DB
          </label>
        </div>

        <Composer
          value={composer}
          onChange={setComposer}
          onSend={() => void onSend()}
          disabled={busy}
          voicePill={activeProfile?.creator_name ?? "No voice"}
          modelPill="GPT-4.1-nano"
        />
      </div>

      <ContextRail
        activeProfile={activeProfile}
        toolMemory={toolMemory}
        toolResearch={toolResearch}
        toolWorkflow={toolWorkflow}
        toolMongodb={toolMongodb}
        setToolMemory={setToolMemory}
        setToolResearch={setToolResearch}
        setToolWorkflow={setToolWorkflow}
        setToolMongodb={setToolMongodb}
        onRecategorize={onRecategorize}
        recBusy={recBusy}
        twinSessionId={sessionId}
        ttsInitialText={ttsSeed}
        onClearTtsText={() => setTtsSeed(null)}
      />
    </div>
  );
}

export default TwinChatView;
