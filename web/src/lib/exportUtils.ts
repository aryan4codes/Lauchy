/** Client-side transcripts + blobs for Twin export. */

export type ExportTurn =
  | { kind: "user"; content: string }
  | { kind: "assistant"; content: string }
  | { kind: "tool"; name: string; summary: string }
  | { kind: "action"; runId: string; resultsUrl: string; templateId?: string };

export type SessionMetaLite = {
  session_id?: string;
  voice_profile_id?: string | null;
  created_at?: string;
  updated_at?: string;
  voice_creator_name?: string | null;
  content_categories?: string[];
};

/** Safe filename snippet from creator/session. */
export function exportBaseName(slug?: string | null, sessionFallback?: string) {
  const raw = slug?.trim() || sessionFallback?.slice(0, 8).trim() || "session";
  const safe = raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.]/g, "")
    .slice(0, 42);
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  return `launchy-twin-${safe || "creator"}-${stamp}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function stripMarkdownLike(s: string): string {
  return s
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}

export function rowsToTxt(rows: ExportTurn[]): string {
  let out = "";
  for (const r of rows) {
    if (r.kind === "user") out += `You\n${r.content}\n\n`;
    else if (r.kind === "assistant") out += `Twin\n${stripMarkdownLike(r.content)}\n\n`;
    else if (r.kind === "tool") out += `[Tool ${r.name}]\n${r.summary}\n\n`;
    else if (r.kind === "action")
      out += `[Workflow]\nrun ${r.runId} → ${r.resultsUrl}\n\n`;
  }
  return out.trim();
}

export function rowsToMarkdown(rows: ExportTurn[], meta?: SessionMetaLite): string {
  const lines: string[] = [];
  if (meta?.session_id) {
    lines.push(`# Twin session transcript`);
    lines.push("");
    lines.push(`- **Session**: \`${meta.session_id}\``);
    if (meta.voice_creator_name)
      lines.push(`- **Voice**: ${meta.voice_creator_name}`);
    if (meta.content_categories?.length)
      lines.push(`- **Content focus**: ${meta.content_categories.join(", ")}`);
    if (meta.created_at) lines.push(`- **Started**: ${meta.created_at}`);
    if (meta.updated_at) lines.push(`- **Updated**: ${meta.updated_at}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  for (const r of rows) {
    if (r.kind === "user") {
      lines.push(`## You`, "", r.content, "");
    } else if (r.kind === "assistant") {
      lines.push(`## Twin`, "", r.content, "");
    } else if (r.kind === "tool") {
      lines.push(`> **Tool**: ${r.name} — ${r.summary.replace(/\n/g, " ").slice(0, 380)}`);
      lines.push("");
    } else if (r.kind === "action") {
      lines.push(`- [Workflow run: \`${r.runId}\`](${r.resultsUrl})`);
      lines.push("");
    }
  }
  return lines.join("\n").trim() + "\n";
}

export function rowsToSessionJson(rows: ExportTurn[], meta?: SessionMetaLite): string {
  return JSON.stringify({ meta: meta ?? null, transcript: rows }, null, 2) + "\n";
}
