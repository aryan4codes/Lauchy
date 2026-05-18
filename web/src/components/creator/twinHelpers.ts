import type { TwinAssistantBridge } from "@/components/twin/MessageBubble";
import type { ExportTurn } from "@/lib/exportUtils";

/** Client-side mirrored row from persisted OpenAI-compatible JSON lines. */
export type UiTurn =
  | { id: string; kind: "user"; content: string }
  | { id: string; kind: "assistant"; content: string; streaming?: boolean }
  | { id: string; kind: "tool"; name: string; summary: string }
  | { id: string; kind: "action"; runId: string; resultsUrl: string; templateId?: string };

export function randomTwinRowId(): string {
  return `m-${crypto.randomUUID().slice(0, 12)}`;
}

export function rowsFromStored(messages: unknown[]): UiTurn[] {
  const rows: UiTurn[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const role = o.role;
    const content = typeof o.content === "string" ? o.content : "";
    if (role === "user") rows.push({ id: randomTwinRowId(), kind: "user", content });
    else if (role === "assistant" && content.trim()) rows.push({ id: randomTwinRowId(), kind: "assistant", content });
    else if (role === "tool") {
      const nameGuess =
        typeof o.name === "string" && o.name.trim().length ? o.name : content.split(/[:#\n]/)[0]?.trim()?.slice(0, 72) ?? "tool";
      rows.push({
        id: randomTwinRowId(),
        kind: "tool",
        name: String(nameGuess).slice(0, 80),
        summary: content.slice(0, 4000),
      });
    }
  }
  return rows;
}

/** Walk backwards collecting tools/actions until preceding user utterance for export context. */
export function assistantBridgingForIndex(rows: UiTurn[], aiIndex: number): { precedingUser: string | null; bridging: TwinAssistantBridge } {
  const bridging: TwinAssistantBridge = [];
  let precedingUser: string | null = null;
  for (let j = aiIndex - 1; j >= 0; j--) {
    const rw = rows[j];
    if (rw.kind === "user") {
      precedingUser = rw.content;
      break;
    }
    if (rw.kind === "tool") bridging.unshift({ kind: "tool", name: rw.name, summary: rw.summary });
    if (rw.kind === "action")
      bridging.unshift({ kind: "action", runId: rw.runId, resultsUrl: rw.resultsUrl, templateId: rw.templateId });
  }
  return { precedingUser, bridging };
}

/**
 * Prefer the verbatim lines inside ```voice_script ... ``` (Twin is prompted to fence reel/narration that way).
 * Accepts aliases `tts`, `spoken`, `reel_script`. If no fence, returns trimmed full text so older replies still work.
 */
export function extractVoiceScriptForTts(raw: string): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";

  const fence = /```(?:voice_script|tts|spoken|reel_script)\b[ \t]*\r?\n([\s\S]*?)```/i;
  const m = fence.exec(s);
  if (m?.[1] != null) return m[1].replace(/\r\n/g, "\n").trim();
  return s;
}

/** UI rows → deterministic export fragments (session transcript). */
export function uiTurnsToExportTurns(rows: UiTurn[]): ExportTurn[] {
  const out: ExportTurn[] = [];
  for (const r of rows) {
    if (r.kind === "user") out.push({ kind: "user", content: r.content });
    else if (r.kind === "assistant") {
      if (r.streaming) continue;
      if (!r.content.trim()) continue;
      out.push({ kind: "assistant", content: r.content });
    } else if (r.kind === "tool") out.push({ kind: "tool", name: r.name, summary: r.summary });
    else if (r.kind === "action") out.push({ kind: "action", runId: r.runId, resultsUrl: r.resultsUrl, templateId: r.templateId });
  }
  return out;
}
