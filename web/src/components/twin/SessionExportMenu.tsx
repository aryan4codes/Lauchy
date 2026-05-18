import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { ExportTurn } from "@/lib/exportUtils";
import { downloadBlob, exportBaseName, rowsToMarkdown, rowsToSessionJson, rowsToTxt } from "@/lib/exportUtils";
import type { SessionMetaLite } from "@/lib/exportUtils";

/** Full session transcript export (Markdown + JSON). */
export function SessionExportMenu({
  disabled,
  rows,
  meta,
  creatorSlug,
}: {
  disabled?: boolean;
  rows: ExportTurn[];
  meta: SessionMetaLite | null | undefined;
  creatorSlug?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const base =
    meta?.voice_creator_name != null ? exportBaseName(meta.voice_creator_name, meta.session_id) : exportBaseName(creatorSlug, meta?.session_id);

  const downloadMd = () => {
    const blob = new Blob([rowsToMarkdown(rows, meta ?? {})], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, `${base}.md`);
    setOpen(false);
  };

  const downloadTxt = () => {
    const blob = new Blob([rowsToTxt(rows)], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${base}.txt`);
    setOpen(false);
  };

  const downloadJson = () => {
    const blob = new Blob([rowsToSessionJson(rows, meta ?? {})], { type: "application/json;charset=utf-8" });
    downloadBlob(blob, `${base}.json`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor>
        <PopoverTrigger
          aria-label="Export chat transcript"
          type="button"
          disabled={disabled}
          title="Export"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border bg-background px-3 text-[12px] font-semibold hover:bg-muted/80 disabled:opacity-45"
        >
          <Download className="hidden h-3.5 w-3.5 sm:inline" aria-hidden />
          Export
        </PopoverTrigger>
      </PopoverAnchor>
      <PopoverContent align="end" className="w-52 space-y-1 p-3">
        <p className="mb-2 text-[11px] text-muted-foreground">Download Twin chat transcript</p>
        <Button variant="secondary" size="sm" type="button" className="w-full justify-between text-[12px]" onClick={downloadMd}>
          Markdown <span className="font-mono text-[10px] opacity-60">.md</span>
        </Button>
        <Button variant="secondary" size="sm" type="button" className="w-full justify-between text-[12px]" onClick={downloadTxt}>
          Plaintext <span className="font-mono text-[10px] opacity-60">.txt</span>
        </Button>
        <Button variant="secondary" size="sm" type="button" className="w-full justify-between text-[12px]" onClick={downloadJson}>
          JSON archive <span className="font-mono text-[10px] opacity-60">.json</span>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
