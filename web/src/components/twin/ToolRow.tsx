import { BookOpenCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ToolRow({ name, summary }: { name: string; summary: string }) {
  const [open, setOpen] = useState(false);
  const oneLine = summary.replace(/\s+/g, " ").slice(0, 120) + (summary.length > 120 ? "…" : "");

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 border-l-violet-400/85 border-border bg-muted/25 py-2 pl-3 pr-2 text-xs shadow-sm backdrop-blur-sm dark:border-border dark:bg-muted/15",
      )}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer flex-wrap items-center gap-2 text-left"
        aria-expanded={open}
        aria-label={`Expand tool ${name}`}
        onClick={() => setOpen((x) => !x)}
      >
        <BookOpenCheck className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
        <span className="flex-1 font-medium text-foreground">
          Used tool <span className="font-mono text-[11px] text-muted-foreground">{name}</span>
        </span>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" aria-hidden>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </button>
      {!open ? (
        <p className="mt-1 truncate pl-7 text-muted-foreground">{oneLine}</p>
      ) : (
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap pl-7 font-mono text-[11px] text-muted-foreground">
          {summary}
        </pre>
      )}
    </div>
  );
}
