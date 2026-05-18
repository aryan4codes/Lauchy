import { Keyboard, Paperclip, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  className,
  voicePill,
  modelPill,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  className?: string;
  voicePill?: string | null;
  modelPill?: string | null;
}) {
  return (
    <div className={cn("border-t border-border bg-muted/25 dark:bg-card/90", className)}>
      <div className="flex items-end gap-2 p-3 md:gap-3 md:p-4">
        <button
          type="button"
          aria-label="Attachments — coming soon"
          title="Coming soon"
          disabled
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground sm:inline-flex"
        >
          <Paperclip className="h-4 w-4" aria-hidden />
        </button>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask your Digital Twin… (Shift+Enter newline)"
          aria-label="Twin message composer"
          className="min-h-[56px] flex-1 resize-none rounded-2xl border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring md:min-h-[68px]"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!disabled && value.trim()) onSend();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          aria-label="Send Twin message"
          disabled={disabled || !value.trim()}
          className="h-11 w-11 shrink-0 rounded-xl p-0"
          variant="default"
          onClick={() => onSend()}
        >
          <Send className="h-4 w-4" aria-hidden />
          <span className="sr-only">Send</span>
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-background/55 px-4 py-2 text-[10px] text-muted-foreground dark:bg-background/35 md:px-6">
        <div className="flex flex-wrap gap-1.5">
          {voicePill ? (
            <span className="rounded-full border px-2 py-0.5 font-medium text-foreground" title="Voice profile">
              Voice · {voicePill}
            </span>
          ) : (
            <span className="rounded-full border border-dashed px-2 py-0.5">Voice · none</span>
          )}
          {modelPill ? (
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono" title="Routing model">
              Model · {modelPill}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Keyboard className="h-3 w-3 opacity-80" aria-hidden />
          <span className="font-medium tracking-wide">Enter · send · Shift+Enter · newline · / soon</span>
        </div>
      </div>
    </div>
  );
}
