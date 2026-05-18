import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { workflowRunWebSocketUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ActionRunCard({
  runId,
  resultsUrl,
  templateId,
}: {
  runId: string;
  resultsUrl: string;
  templateId?: string;
}) {
  const [status, setStatus] = useState<string>("starting");
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const ws = new WebSocket(workflowRunWebSocketUrl(runId));
    ws.onmessage = (evt) => {
      try {
        const d = JSON.parse(evt.data as string) as { type?: string };
        if (d.type === "sync" || d.type === "run_finished") {
          setStatus("done");
          setProgress(100);
          ws.close();
        }
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      /* no-op */
    };
    ws.onerror = () => setStatus("error");
    const pulse = window.setInterval(() => {
      setProgress((p) => (p >= 88 ? p : Math.min(p + Math.random() * 18 + 4, 88)));
    }, 820);
    return () => {
      ws.close();
      window.clearInterval(pulse);
    };
  }, [runId]);

  return (
    <div className="max-w-xl rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-3 text-xs shadow-inner">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status === "done" ? "secondary" : "muted"}>{status}</Badge>
        {templateId ? <span className="font-semibold tracking-tight text-foreground">{templateId}</span> : null}
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 transition-[width] duration-700",
            status === "done" && "from-emerald-500 to-teal-500",
          )}
          style={{ width: `${progress}%` }}
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label="Workflow progress"
        />
      </div>
      <p className="mt-3 font-mono text-[11px] text-muted-foreground">{runId}</p>
      <div className="mt-3 flex gap-2">
        <Button asChild size="sm" variant="default">
          <Link to={resultsUrl} aria-label="Open workflow results">
            Open results
          </Link>
        </Button>
      </div>
    </div>
  );
}
