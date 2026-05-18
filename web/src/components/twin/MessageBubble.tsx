import { Copy, Download, Sparkles, Volume2 } from "lucide-react";
import { useState } from "react";

import { MarkdownProse } from "@/components/MarkdownProse";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { downloadBlob, exportBaseName, rowsToMarkdown, rowsToSessionJson, rowsToTxt } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

export type TwinAssistantBridge = Array<
  | { kind: "tool"; name: string; summary: string }
  | { kind: "action"; runId: string; resultsUrl: string; templateId?: string }
>;

export function composeAssistantTurns(opts: {
  content: string;
  precedingUser: string | null;
  bridging: TwinAssistantBridge;
}): ExportTurn[] {
  const parts: ExportTurn[] = [];
  if (opts.precedingUser) parts.push({ kind: "user", content: opts.precedingUser });
  for (const b of opts.bridging) {
    if (b.kind === "tool") parts.push({ kind: "tool", name: b.name, summary: b.summary });
    else parts.push({ kind: "action", runId: b.runId, resultsUrl: b.resultsUrl, templateId: b.templateId });
  }
  parts.push({ kind: "assistant", content: opts.content });
  return parts;
}

export function MessageBubble({
  role,
  content,
  showTwinLabel,
  assistantExportPack,
  onHearTwin,
}: {
  role: "user" | "twin";
  content: string;
  showTwinLabel?: boolean;
  assistantExportPack?: {
    bridging: TwinAssistantBridge;
    precedingUser: string | null;
    creatorSlug?: string | null;
  } | null;
  onHearTwin?: () => void;
}) {
  const twin = role === "twin";
  const text = typeof content === "string" ? content : "";
  const [copied, setCopied] = useState(false);
  const hasBody = text.trim().length > 0;

  const compose = (): ExportTurn[] =>
    composeAssistantTurns({
      content: text,
      precedingUser: assistantExportPack?.precedingUser ?? null,
      bridging: assistantExportPack?.bridging ?? [],
    });

  const downloadOne = (mode: "md" | "txt" | "json") => {
    const slug =
      assistantExportPack?.creatorSlug?.trim()?.length ?? 0 ? exportBaseName(assistantExportPack?.creatorSlug) : exportBaseName(null, "msg");
    const turns = compose();
    let mime: string;
    let payload: string;
    let ext: string;
    if (mode === "md") {
      payload = rowsToMarkdown(turns);
      mime = "text/markdown;charset=utf-8";
      ext = ".md";
    } else if (mode === "txt") {
      payload = rowsToTxt(turns);
      mime = "text/plain;charset=utf-8";
      ext = ".txt";
    } else {
      payload = rowsToSessionJson(turns);
      mime = "application/json;charset=utf-8";
      ext = ".json";
    }
    downloadBlob(new Blob([payload], { type: mime }), `${slug}${ext}`);
  };

  const copyTwin = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1100);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={cn("flex gap-2.5 md:gap-3", twin ? "justify-start" : "justify-end")}>
      {twin ? (
        <span
          className="mt-9 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 text-white shadow"
          aria-hidden
        >
          <Sparkles className="h-4 w-4" />
        </span>
      ) : null}

      <div
        className={cn(
          "group/message relative max-w-[min(720px,_92%)] px-4 py-3",
          twin && hasBody && "md:pr-44",
          twin
            ? "rounded-[1.7rem] rounded-bl-md bg-muted/70 shadow-sm backdrop-blur dark:bg-muted/50"
            : "rounded-[1.65rem] rounded-br-xl bg-emerald-950 text-emerald-50 shadow-md ring-1 ring-black/10 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-border",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-safe:slide-in-from-bottom-5",
        )}
      >
        {twin ? (
          <>
            {showTwinLabel ? (
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Twin</p>
            ) : (
              <span className="sr-only">Twin reply</span>
            )}
          </>
        ) : null}

        {twin && hasBody ? (
          <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-lg border border-border/70 bg-background/95 p-1 shadow-sm backdrop-blur dark:bg-card/95 md:opacity-0 md:transition-opacity md:group-hover/message:opacity-100">
            <Button type="button" variant="outline" size="sm" aria-label={copied ? "Copied" : "Copy"} title="Copy" onClick={() => void copyTwin()}>
              <Copy className="h-3.5 w-3.5" aria-hidden />
            </Button>
            {assistantExportPack ? (
              <Popover>
                <PopoverAnchor>
                  <PopoverTrigger
                    type="button"
                    aria-label="Download Twin answer"
                    title="Export"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </PopoverTrigger>
                </PopoverAnchor>
                <PopoverContent align="end" side="bottom" sideOffset={6} className="w-56">
                  <p className="mb-3 text-[11px] text-muted-foreground">Download this reply</p>
                  <Button type="button" variant="outline" size="sm" className="mb-2 w-full" onClick={() => downloadOne("md")}>
                    Markdown
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="mb-2 w-full" onClick={() => downloadOne("txt")}>
                    Plain text
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => downloadOne("json")}>
                    JSON
                  </Button>
                </PopoverContent>
              </Popover>
            ) : null}
            {onHearTwin ? (
              <Button type="button" aria-label="Hear aloud" variant="outline" size="sm" title="Speak" onClick={() => onHearTwin()}>
                <Volume2 className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        ) : null}

        {hasBody ? (
          twin ? (
            <MarkdownProse
              content={text}
              className="!prose-sm !leading-relaxed text-foreground dark:prose-invert prose-p:my-2 prose-headings:mt-3"
            />
          ) : (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-emerald-50 dark:text-zinc-100">{text}</p>
          )
        ) : null}
      </div>
    </div>
  );
}
