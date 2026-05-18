import { Sparkles } from "lucide-react";

import { TtsPanel } from "@/components/twin/TtsPanel";
import { Button } from "@/components/ui/button";
import type { VoiceProfile } from "@/lib/api";
import { cn } from "@/lib/utils";

function ToolToggleRow({
  label,
  desc,
  checked,
  onToggle,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  const id = `twin-switch-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/35 px-2.5 py-2 shadow-sm backdrop-blur-sm dark:bg-muted/20">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} title={desc} className="block cursor-pointer text-[12px] font-semibold leading-snug text-foreground">
          {label}
        </label>
        <span className="block text-[11px] text-muted-foreground">{desc.slice(0, 120)}{desc.length > 120 ? "…" : ""}</span>
      </div>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        title={checked ? "Enabled" : "Disabled"}
        aria-label={`Toggle ${label}: ${checked ? "on" : "off"}`}
        onClick={() => onToggle(!checked)}
        className={cn(
          "relative h-8 w-[44px] shrink-0 rounded-full border px-px transition-colors",
          checked ? "border-primary bg-primary shadow-inner" : "border-border bg-background",
        )}
      >
        <span
          className={cn(
            "block h-[27px] w-[27px] translate-x-px rounded-full bg-background shadow transition-transform duration-150",
            checked && "translate-x-[10px]",
          )}
          aria-hidden
        />
      </button>
    </div>
  );
}

export function ContextRail({
  activeProfile,
  toolMemory,
  toolResearch,
  toolWorkflow,
  toolMongodb,
  setToolMemory,
  setToolResearch,
  setToolWorkflow,
  setToolMongodb,
  onRecategorize,
  recBusy,
  twinSessionId,
  ttsInitialText,
  onClearTtsText,
}: {
  activeProfile: VoiceProfile | null;
  toolMemory: boolean;
  toolResearch: boolean;
  toolWorkflow: boolean;
  toolMongodb: boolean;
  setToolMemory: (v: boolean) => void;
  setToolResearch: (v: boolean) => void;
  setToolWorkflow: (v: boolean) => void;
  setToolMongodb: (v: boolean) => void;
  onRecategorize: () => Promise<void>;
  recBusy: boolean;
  twinSessionId: string | null;
  ttsInitialText?: string | null;
  onClearTtsText?: () => void;
}) {
  const cats = activeProfile?.content_categories ?? [];

  return (
    <aside className="hidden h-full w-[17.75rem] shrink-0 overflow-y-auto rounded-2xl border border-border bg-card/92 p-3 shadow-inner xl:flex xl:flex-col">
      <span className="mb-3 block px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Twin context
      </span>

      <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/25 p-3 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-white shadow">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {activeProfile?.creator_name ?? "No voice yet"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {activeProfile ? `${activeProfile.sample_count} training samples` : "Train to unlock tone-aware replies"}
            </p>
          </div>
        </div>
        {activeProfile?.updated_at ? (
          <p className="mt-2 text-[10px] text-muted-foreground">Updated {activeProfile.updated_at.slice(0, 10)}</p>
        ) : null}

        {(cats?.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cats!.map((c) => (
              <span
                key={c}
                className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] leading-tight shadow-sm backdrop-blur-sm"
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            aria-label="Generate genre tags from saved profile"
            disabled={!activeProfile || recBusy}
            onClick={() => void onRecategorize()}
          >
            {recBusy ? "Inferring genres…" : "Infer genres"}
          </Button>
        )}
      </div>

      <section className="mt-6">
        <span className="block px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Knowledge
        </span>
        <div className="mt-2 space-y-2">
          <ToolToggleRow
            label="Memory"
            checked={toolMemory}
            desc="Launchy scoring memory (Chroma)."
            onToggle={setToolMemory}
          />
          <ToolToggleRow
            label="Voice DB"
            checked={toolMongodb}
            desc="Training chunks in Mongo (captions/transcripts)."
            onToggle={setToolMongodb}
          />
        </div>
      </section>

      <section className="mt-5">
        <span className="block px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Fresh signals
        </span>
        <div className="mt-2 space-y-2">
          <ToolToggleRow
            label="Research"
            checked={toolResearch}
            desc="Reddit signals + Serper web/news."
            onToggle={setToolResearch}
          />
        </div>
      </section>

      <section className="mt-5 shrink-0">
        <span className="block px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Automation
        </span>
        <div className="mt-2 space-y-2">
          <ToolToggleRow
            label="Workflows"
            checked={toolWorkflow}
            desc="Twin can start Workflow Studio DAGs."
            onToggle={setToolWorkflow}
          />
        </div>
      </section>

      <section className="mt-6 shrink-0 border-t border-border pt-4 pb-28">
        <TtsPanel
          sessionId={twinSessionId}
          presetText={ttsInitialText}
          clearPreset={() => onClearTtsText?.()}
        />
      </section>
    </aside>
  );
}
