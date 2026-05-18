import { Link } from "react-router-dom";

import type { VoiceProfile } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

export type TwinSessionRow = {
  session_id: string;
  voice_profile_id: string | null;
  preview?: string;
  created_at: string;
  updated_at: string;
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(8, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SessionRail({
  tab,
  onTabChat,
  onTabTrain,
  sessions,
  sessionId,
  onSelectSession,
  onNewChat,
  voices,
  activeVoiceId,
  onVoicePick,
  busy,
}: {
  tab: "chat" | "train";
  onTabChat: () => void;
  onTabTrain: () => void;
  sessions: TwinSessionRow[];
  sessionId: string | null;
  onSelectSession: (sid: string) => void;
  onNewChat: () => void;
  voices: VoiceProfile[];
  activeVoiceId: string | null;
  onVoicePick: (id: string | null) => void;
  busy: boolean;
}) {
  const trainActive = tab === "train";

  return (
    <aside className="hidden h-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/96 shadow-inner md:flex md:w-[14.5rem] lg:w-[16.5rem]">
      <nav className="flex flex-col gap-1 border-b border-border p-2.5 pb-3">
        <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Mode
        </span>
        <button
          type="button"
          aria-current={!trainActive}
          aria-label="Twin chat workspace"
          onClick={onTabChat}
          className={cn(
            "rounded-xl px-3 py-3 text-left text-sm font-semibold transition",
            !trainActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted/80",
          )}
        >
          <MessageCircle className="mr-2 inline-block h-4 w-4 align-middle" aria-hidden /> Twin chat
        </button>
        <button
          type="button"
          aria-current={trainActive}
          aria-label="Train voice workspace"
          onClick={onTabTrain}
          className={cn(
            "rounded-xl px-3 py-3 text-left text-sm font-semibold transition",
            trainActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted/80",
          )}
        >
          Train voice
        </button>
        <ThemeToggle />
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        <Button
          type="button"
          size="sm"
          className="mb-4 w-full"
          aria-label="Start new Twin chat session"
          onClick={() => void onNewChat()}
          disabled={busy}
        >
          New chat
        </Button>
        <span className="mb-2 block px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Sessions
        </span>
        <ul className="space-y-1.5 pb-24">
          {sessions.map((s) => (
            <li key={s.session_id}>
              <button
                type="button"
                aria-current={sessionId === s.session_id}
                aria-label={`Open conversation ${s.session_id.slice(0, 8)}`}
                disabled={busy}
                onClick={() => onSelectSession(s.session_id)}
                className={cn(
                  "flex w-full flex-col rounded-xl px-3 py-2 text-left transition",
                  sessionId === s.session_id ? "border border-primary/40 bg-muted" : "hover:bg-muted/60",
                )}
              >
                <span className="line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight text-foreground">
                  {s.preview?.trim()
                    ? s.preview
                    : `Chat ${s.session_id.slice(0, 8)}`}
                </span>
                <div className="mt-2 flex justify-between gap-2 font-mono text-[10px] text-muted-foreground">
                  <span>{timeAgo(s.updated_at)}</span>
                  <span className="max-w-[7rem] truncate" title={s.voice_profile_id ?? undefined}>
                    {voices.find((v) => v.profile_id === s.voice_profile_id)?.creator_name ??
                      s.voice_profile_id?.slice(0, 8) ??
                      "—"}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Voice</p>
        <select
          className={cn(
            "mt-2 h-9 w-full max-w-full truncate rounded-xl border bg-background px-2 text-[12px] font-medium outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
          )}
          value={activeVoiceId ?? ""}
          aria-label="Active voice profile for Twin replies"
          onChange={(e) => onVoicePick(e.target.value || null)}
          disabled={busy}
        >
          <option value="">None</option>
          {voices.map((v) => (
            <option key={v.profile_id} value={v.profile_id}>
              {v.creator_name}
            </option>
          ))}
        </select>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Profiles on{" "}
          <Link to="/twin?tab=train" className="font-medium underline decoration-muted-foreground/60 underline-offset-2">
            Train voice
          </Link>
          .
        </p>
      </div>
    </aside>
  );
}
